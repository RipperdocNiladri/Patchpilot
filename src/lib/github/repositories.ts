import { FileNode, RepositoryMeta } from "@/types";
import type { FileContentResponse } from "@/lib/api";
import {
  DEMO_FILES,
  DEMO_FILE_TREE,
  DEMO_REPOSITORY,
  isDemoRepo,
} from "@/data/demo-repository";
import { GitHubClient, GitHubTreeItem } from "@/lib/github/client";
import {
  HttpError,
  validateFilePath,
  validateIdentifier,
} from "@/lib/validation";

const IGNORED_PREFIXES = [
  ".git/",
  "node_modules/",
  "vendor/",
  "__pycache__/",
  ".venv/",
  "dist/",
  "build/",
];

const PRIORITY_START_FILES = [
  "src/index.ts",
  "src/index.js",
  "src/main.ts",
  "src/main.py",
  "app/main.py",
  "main.py",
  "app.py",
  "index.js",
  "server.js",
  "src/App.tsx",
  "src/App.jsx",
  "README.md",
];

interface InternalTreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
  badge?: string;
  children?: Record<string, InternalTreeNode>;
}

export class RepositoryService {
  private readonly github: GitHubClient;

  constructor(githubClient?: GitHubClient) {
    this.github = githubClient ?? new GitHubClient();
  }

  async getOverview(owner: string, repo: string): Promise<RepositoryMeta> {
    const cleanOwner = validateIdentifier(owner, "owner");
    const cleanRepo = validateIdentifier(repo, "repo");

    if (isDemoRepo(cleanOwner, cleanRepo)) {
      return DEMO_REPOSITORY;
    }

    const repoData = await this.github.getRepository(cleanOwner, cleanRepo);
    const defaultBranch = repoData.default_branch || "main";

    const [readmeData, treeItems] = await Promise.all([
      this.github.getReadme(cleanOwner, cleanRepo),
      this.github.getTree(cleanOwner, cleanRepo, defaultBranch),
    ]);

    const filePaths = treeItems
      .filter((item) => item.type === "blob" && item.path)
      .map((item) => item.path as string);
    const totalFiles = filePaths.length > 0 ? filePaths.length : 1;

    const topDirs = new Set<string>();
    for (const p of filePaths) {
      if (
        p.includes("/") &&
        !p.startsWith(".") &&
        !p.startsWith("node_modules") &&
        !p.startsWith("vendor")
      ) {
        topDirs.add(p.split("/")[0]);
      }
    }
    const coreModulesCount = topDirs.size > 0 ? topDirs.size : 1;

    const recommendedStartFile = this.findRecommendedStart(filePaths);

    const hasReadme = Boolean(readmeData?.content);
    const hasLicense = Boolean(repoData.license);
    const hasIssuesEnabled = repoData.has_issues ?? true;

    let score = 60;
    if (hasReadme) score += 20;
    if (hasLicense) score += 10;
    if (hasIssuesEnabled && (repoData.open_issues_count ?? 0) > 0) score += 10;
    score = Math.min(score, 98);

    const minutes = Math.max(
      15,
      Math.min(60, Math.floor(totalFiles / 2) + 10)
    );

    let licenseName = "None";
    if (repoData.license && typeof repoData.license === "object") {
      licenseName =
        repoData.license.spdx_id || repoData.license.name || "Custom";
    }

    const readmeText = readmeData?.content || "";

    return {
      owner: repoData.owner?.login || cleanOwner,
      name: repoData.name || cleanRepo,
      fullName: repoData.full_name || `${cleanOwner}/${cleanRepo}`,
      description: repoData.description || "No description provided.",
      isPublic: !repoData.private,
      language: repoData.language || "Other",
      license: licenseName,
      stars: repoData.stargazers_count ?? 0,
      forks: repoData.forks_count ?? 0,
      openIssuesCount: repoData.open_issues_count ?? 0,
      defaultBranch,
      totalFiles,
      coreModulesCount,
      accessibilityScore: score,
      estimatedOnboardingMinutes: minutes,
      recommendedStartFile,
      readme: readmeText ? readmeText.slice(0, 5000) : undefined,
      topics: Array.isArray(repoData.topics) ? repoData.topics : [],
    };
  }

  async getTree(owner: string, repo: string): Promise<FileNode[]> {
    const cleanOwner = validateIdentifier(owner, "owner");
    const cleanRepo = validateIdentifier(repo, "repo");

    if (isDemoRepo(cleanOwner, cleanRepo)) {
      return DEMO_FILE_TREE;
    }

    const repoData = await this.github.getRepository(cleanOwner, cleanRepo);
    const branch = repoData.default_branch || "main";
    const treeItems = await this.github.getTree(cleanOwner, cleanRepo, branch);

    if (!treeItems || treeItems.length === 0) {
      return [
        {
          name: "README.md",
          path: "README.md",
          type: "file",
          badge: "Recommended Start",
        },
      ];
    }

    const filtered = treeItems.filter((item) => {
      const p = item.path || "";
      return (
        p.length > 0 &&
        !IGNORED_PREFIXES.some((prefix) => p.startsWith(prefix))
      );
    });

    const filePaths = filtered
      .filter((item) => item.type === "blob" && item.path)
      .map((item) => item.path as string);
    const recommendedStart = this.findRecommendedStart(filePaths);

    return this.buildNestedTree(filtered, recommendedStart);
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<FileContentResponse> {
    const cleanOwner = validateIdentifier(owner, "owner");
    const cleanRepo = validateIdentifier(repo, "repo");
    const cleanPath = validateFilePath(path);

    if (isDemoRepo(cleanOwner, cleanRepo)) {
      if (cleanPath in DEMO_FILES) {
        return DEMO_FILES[cleanPath];
      }
      throw new HttpError(404, `File '${cleanPath}' not found on GitHub.`);
    }

    return this.github.getFileContent(cleanOwner, cleanRepo, cleanPath);
  }

  findRecommendedStart(filePaths: string[]): string {
    for (const candidate of PRIORITY_START_FILES) {
      if (filePaths.includes(candidate)) {
        return candidate;
      }
    }

    for (const path of filePaths) {
      const lower = path.toLowerCase();
      if (
        lower.includes("main.") ||
        lower.includes("index.") ||
        lower.includes("app.") ||
        lower.includes("router")
      ) {
        return path;
      }
    }

    return filePaths[0] || "README.md";
  }

  buildNestedTree(
    items: GitHubTreeItem[],
    recommendedPath: string
  ): FileNode[] {
    const rootMap: Record<string, InternalTreeNode> = {};

    for (const item of items) {
      const rawPath = item.path || "";
      if (!rawPath) continue;

      const itemType: "file" | "folder" =
        item.type === "tree" ? "folder" : "file";
      const parts = rawPath.split("/");

      let curr = rootMap;
      let currPath = "";

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currPath = currPath ? `${currPath}/${part}` : part;
        const isLast = i === parts.length - 1;

        if (!(part in curr)) {
          curr[part] = {
            name: part,
            path: currPath,
            type: isLast ? itemType : "folder",
            size: isLast ? item.size : undefined,
            badge:
              isLast && currPath === recommendedPath
                ? "Recommended Start"
                : undefined,
            children: !isLast || itemType === "folder" ? {} : undefined,
          };
        } else if (isLast && itemType === "file") {
          curr[part].type = "file";
          curr[part].size = item.size;
          if (currPath === recommendedPath) {
            curr[part].badge = "Recommended Start";
          }
        }

        if (!isLast) {
          if (!curr[part].children) {
            curr[part].children = {};
          }
          curr = curr[part].children!;
        }
      }
    }

    const dictToNodes = (map: Record<string, InternalTreeNode>): FileNode[] => {
      const nodes: FileNode[] = Object.values(map).map((val) => {
        const node: FileNode = {
          name: val.name,
          path: val.path,
          type: val.type,
        };
        if (val.badge) node.badge = val.badge;
        if (val.size !== undefined) node.size = val.size;
        if (val.children) {
          node.children = dictToNodes(val.children);
        }
        return node;
      });

      return nodes.sort((a, b) => {
        const aType = a.type === "folder" ? 0 : 1;
        const bType = b.type === "folder" ? 0 : 1;
        if (aType !== bType) return aType - bType;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    };

    return dictToNodes(rootMap);
  }
}
