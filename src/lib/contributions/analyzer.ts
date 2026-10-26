import { ContributionOpportunity } from "@/types";
import { DEMO_OPPORTUNITIES, isDemoRepo } from "@/data/demo-repository";
import { GitHubClient, GitHubIssueItem } from "@/lib/github/client";
import { validateIdentifier } from "@/lib/validation";

const SCANNABLE_EXTENSIONS = [".py", ".ts", ".tsx", ".js", ".jsx", ".md"];
const SKIP_PATH_TERMS = ["node_modules", "vendor", ".min.", "dist/"];
const BEGINNER_TERMS = [
  "good first issue",
  "beginner",
  "easy",
  "documentation",
  "docs",
  "starter",
  "help wanted",
];
const DOC_TERMS = ["doc", "readme", "typo", "guide"];
const TEST_TERMS = ["test", "coverage", "unit"];

export class ContributionService {
  private readonly github: GitHubClient;

  constructor(githubClient?: GitHubClient) {
    this.github = githubClient ?? new GitHubClient();
  }

  async getOpportunities(
    owner: string,
    repo: string
  ): Promise<ContributionOpportunity[]> {
    const cleanOwner = validateIdentifier(owner, "owner");
    const cleanRepo = validateIdentifier(repo, "repo");

    if (isDemoRepo(cleanOwner, cleanRepo)) {
      return DEMO_OPPORTUNITIES;
    }

    const opportunities: ContributionOpportunity[] = [];

    // 1. Fetch real open GitHub issues
    const issues = await this.github.getIssues(cleanOwner, cleanRepo, "open", 30);
    for (const issue of issues) {
      const opp = this.issueToOpportunity(cleanOwner, cleanRepo, issue);
      if (opp) {
        opportunities.push(opp);
      }
    }

    // 2. Scan up to 5 repository source/doc files for real TODO / FIXME items
    const tree = await this.github.getTree(cleanOwner, cleanRepo);
    const codeFiles = tree
      .filter((item) => {
        const p = item.path || "";
        return (
          item.type === "blob" &&
          SCANNABLE_EXTENSIONS.some((ext) => p.endsWith(ext))
        );
      })
      .map((item) => item.path as string);

    let scannedCount = 0;
    for (const path of codeFiles) {
      if (scannedCount >= 5) break;
      const lower = path.toLowerCase();
      if (SKIP_PATH_TERMS.some((term) => lower.includes(term))) {
        continue;
      }

      try {
        const fileInfo = await this.github.getFileContent(
          cleanOwner,
          cleanRepo,
          path
        );
        if (fileInfo.isBinary) continue;
        const todoOpps = this.scanContentForTodos(
          cleanOwner,
          cleanRepo,
          path,
          fileInfo.content
        );
        opportunities.push(...todoOpps);
        scannedCount += 1;
      } catch {
        continue;
      }
    }

    // Sort: beginner first, then issues first
    opportunities.sort((a, b) => {
      const aDiff = a.difficulty === "beginner" ? 0 : 1;
      const bDiff = b.difficulty === "beginner" ? 0 : 1;
      if (aDiff !== bDiff) return aDiff - bDiff;
      const aIssue = a.issueUrl ? 0 : 1;
      const bIssue = b.issueUrl ? 0 : 1;
      return aIssue - bIssue;
    });

    return opportunities;
  }

  issueToOpportunity(
    owner: string,
    repo: string,
    issue: GitHubIssueItem
  ): ContributionOpportunity | null {
    const number = issue.number;
    const title = (issue.title || "").trim();
    if (!number || !title) return null;

    const body = issue.body || "";
    const htmlUrl =
      issue.html_url || `https://github.com/${owner}/${repo}/issues/${number}`;

    const labels = (issue.labels || []).map((lbl) => {
      if (typeof lbl === "string") return lbl.toLowerCase();
      return (lbl?.name || "").toLowerCase();
    });
    const labelsStr = labels.join(" ");
    const titleLower = title.toLowerCase();

    const isBeginner = BEGINNER_TERMS.some(
      (term) => labelsStr.includes(term) || titleLower.includes(term)
    );
    const difficulty: ContributionOpportunity["difficulty"] = isBeginner
      ? "beginner"
      : "intermediate";

    let taskType: ContributionOpportunity["type"] = "code-fix";
    let estMinutes = 45;

    if (
      DOC_TERMS.some(
        (term) => labelsStr.includes(term) || titleLower.includes(term)
      )
    ) {
      taskType = "documentation";
      estMinutes = 20;
    } else if (
      TEST_TERMS.some(
        (term) => labelsStr.includes(term) || titleLower.includes(term)
      )
    ) {
      taskType = "unit-test";
      estMinutes = 30;
    }

    const targetFiles: ContributionOpportunity["targetFiles"] = [];
    const fileMatches = body.match(/([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)/g) || [];
    for (const match of fileMatches) {
      if (targetFiles.length >= 2) break;
      if (!match.startsWith("http") && match.includes("/")) {
        targetFiles.push({
          path: match,
          lines: "Referenced in issue",
        });
      }
    }

    const cleanSlug = titleLower
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .slice(0, 30)
      .replace(/^-+|-+$/g, "");
    const branchName = `${taskType}/issue-${number}-${cleanSlug || "fix"}`;

    let description = body
      ? body.slice(0, 280).trim()
      : `Open GitHub issue #${number}: ${title}`;
    if (body.length > 280) {
      description += "...";
    }

    return {
      id: `github-issue-${number}`,
      title,
      description,
      difficulty,
      type: taskType,
      estimatedMinutes: estMinutes,
      sourceBadge: { label: `GitHub #${number}` },
      whyItMatters: "Resolves a verified open community issue on GitHub.",
      targetFiles,
      steps: [
        {
          stepNumber: 1,
          instruction: "Fork repository and clone locally",
          command: `git clone https://github.com/your-username/${repo}.git`,
        },
        {
          stepNumber: 2,
          instruction: `Create a focused branch for issue #${number}`,
          command: `git checkout -b ${branchName}`,
        },
        {
          stepNumber: 3,
          instruction: `Implement changes addressing: ${title}`,
        },
        {
          stepNumber: 4,
          instruction:
            "Commit changes and open a pull request referencing the issue",
          command: `git commit -m "fix: address issue #${number}"`,
        },
      ],
      maintainerTip: `Always link issue #${number} in your pull request description (e.g. 'Fixes #${number}') so maintainers know context.`,
      safetyRating: isBeginner ? 95 : 85,
      suggestedBranchName: branchName,
      issueUrl: htmlUrl,
    };
  }

  scanContentForTodos(
    _owner: string,
    _repo: string,
    path: string,
    content: string
  ): ContributionOpportunity[] {
    const opportunities: ContributionOpportunity[] = [];
    const lines = content.split(/\r?\n/);

    for (let idx = 1; idx <= lines.length; idx++) {
      if (opportunities.length >= 2) break;
      const line = lines[idx - 1];
      const match = line.match(
        /(?:#|\/\/|\/\*|<!--)\s*(TODO|FIXME)\s*[:\-]?\s*(.+)/i
      );
      if (match) {
        const todoType = match[1].toUpperCase();
        const text = match[2]
          .trim()
          .replace(/(\*\/|-->)+\s*$/, "")
          .trim();

        if (text.length < 5 || text.includes("http")) {
          continue;
        }

        const slug = text
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]+/g, "-")
          .slice(0, 25)
          .replace(/^-+|-+$/g, "");
        const branchName = `refactor/${slug || "todo"}`;

        opportunities.push({
          id: `todo-${path.replace(/\//g, "-")}-L${idx}`,
          title: `${todoType} in ${path}: ${text.slice(0, 50)}`,
          description: `Line ${idx} in ${path} contains an explicit note: '${text}'.`,
          difficulty: "beginner",
          type: "code-fix",
          estimatedMinutes: 25,
          sourceBadge: { label: "Found in repo" },
          whyItMatters:
            "Resolves an existing developer note in the codebase to improve overall quality.",
          targetFiles: [{ path, lines: `Line ${idx}` }],
          steps: [
            {
              stepNumber: 1,
              instruction: `Review line ${idx} in ${path} to understand the developer's intent`,
            },
            {
              stepNumber: 2,
              instruction: "Create a feature branch for your refactoring",
              command: `git checkout -b ${branchName}`,
            },
            {
              stepNumber: 3,
              instruction: "Implement the resolution and test thoroughly",
            },
          ],
          maintainerTip:
            "Leave existing comments updated or removed once the task is properly implemented.",
          safetyRating: 90,
          suggestedBranchName: branchName,
        });
      }
    }

    return opportunities;
  }
}
