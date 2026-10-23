import re
from typing import Any, Dict, List, Optional
from app.schemas import (
    ContributionOpportunity,
    ContributionOpportunityBadge,
    ContributionOpportunityStep,
    ContributionOpportunityTargetFile,
)
from app.services.demo_data import DEMO_OPPORTUNITIES, is_demo_repo
from app.services.github_client import GitHubClient


class ContributionService:
    """Service to discover candidate beginner contributions from GitHub issues and source code."""

    def __init__(self, github_client: Optional[GitHubClient] = None):
        self.github = github_client or GitHubClient()

    async def get_opportunities(self, owner: str, repo: str) -> List[ContributionOpportunity]:
        if is_demo_repo(owner, repo):
            return DEMO_OPPORTUNITIES

        opportunities: List[ContributionOpportunity] = []

        # 1. Fetch real open GitHub issues
        issues = await self.github.get_issues(owner, repo, state="open", per_page=30)
        for issue in issues:
            opp = self._issue_to_opportunity(owner, repo, issue)
            if opp:
                opportunities.append(opp)

        # 2. Check for real repository code TODO / FIXME items in primary files
        tree = await self.github.get_tree(owner, repo)
        code_files = [
            item.get("path", "") for item in tree
            if item.get("type") == "blob" and any(
                item.get("path", "").endswith(ext)
                for ext in (".py", ".ts", ".tsx", ".js", ".jsx", ".md")
            )
        ]

        # Scan up to 5 key candidate files to avoid rate limiting
        scanned_count = 0
        for path in code_files:
            if scanned_count >= 5:
                break
            # Focus on source and doc files, skip test fixtures
            if any(term in path.lower() for term in ("node_modules", "vendor", ".min.", "dist/")):
                continue

            try:
                file_info = await self.github.get_file_content(owner, repo, path)
                if file_info.get("isBinary"):
                    continue
                content = file_info.get("content", "")
                todo_opps = self._scan_content_for_todos(owner, repo, path, content)
                opportunities.extend(todo_opps)
                scanned_count += 1
            except Exception:
                continue

        # Sort: beginner first, then issues first
        opportunities.sort(
            key=lambda o: (0 if o.difficulty == "beginner" else 1, 0 if o.issueUrl else 1)
        )
        return opportunities

    def _issue_to_opportunity(
        self, owner: str, repo: str, issue: Dict[str, Any]
    ) -> Optional[ContributionOpportunity]:
        number = issue.get("number")
        title = issue.get("title", "").strip()
        body = issue.get("body") or ""
        html_url = issue.get("html_url") or f"https://github.com/{owner}/{repo}/issues/{number}"

        labels = [lbl.get("name", "").lower() for lbl in issue.get("labels", []) if isinstance(lbl, dict)]
        labels_str = " ".join(labels)
        title_lower = title.lower()

        # Determine difficulty
        is_beginner = any(
            term in labels_str or term in title_lower
            for term in ("good first issue", "beginner", "easy", "documentation", "docs", "starter", "help wanted")
        )
        difficulty = "beginner" if is_beginner else "intermediate"

        # Determine task type
        if any(term in labels_str or term in title_lower for term in ("doc", "readme", "typo", "guide")):
            task_type = "documentation"
            est_minutes = 20
        elif any(term in labels_str or term in title_lower for term in ("test", "coverage", "unit")):
            task_type = "unit-test"
            est_minutes = 30
        else:
            task_type = "code-fix"
            est_minutes = 45

        # Check for file references in issue body
        target_files: List[ContributionOpportunityTargetFile] = []
        file_matches = re.findall(r"([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)", body)
        for f in file_matches[:2]:
            if not f.startswith("http") and "/" in f:
                target_files.append(ContributionOpportunityTargetFile(path=f, lines="Referenced in issue"))

        clean_slug = re.sub(r"[^a-zA-Z0-9]+", "-", title_lower)[:30].strip("-")
        branch_name = f"{task_type}/issue-{number}-{clean_slug}"

        description = body[:280].strip() if body else f"Open GitHub issue #{number}: {title}"
        if len(body) > 280:
            description += "..."

        steps = [
            ContributionOpportunityStep(
                stepNumber=1,
                instruction=f"Fork repository and clone locally",
                command=f"git clone https://github.com/your-username/{repo}.git",
            ),
            ContributionOpportunityStep(
                stepNumber=2,
                instruction=f"Create a focused branch for issue #{number}",
                command=f"git checkout -b {branch_name}",
            ),
            ContributionOpportunityStep(
                stepNumber=3,
                instruction=f"Implement changes addressing: {title}",
            ),
            ContributionOpportunityStep(
                stepNumber=4,
                instruction="Commit changes and open a pull request referencing the issue",
                command=f'git commit -m "fix: address issue #{number}"',
            ),
        ]

        return ContributionOpportunity(
            id=f"github-issue-{number}",
            title=title,
            description=description,
            difficulty=difficulty,
            type=task_type,
            estimatedMinutes=est_minutes,
            sourceBadge=ContributionOpportunityBadge(label=f"GitHub #{number}"),
            whyItMatters="Resolves a verified open community issue on GitHub.",
            targetFiles=target_files,
            steps=steps,
            maintainerTip=f"Always link issue #{number} in your pull request description (e.g. 'Fixes #{number}') so maintainers know context.",
            safetyRating=95 if is_beginner else 85,
            suggestedBranchName=branch_name,
            issueUrl=html_url,
        )

    def _scan_content_for_todos(
        self, owner: str, repo: str, path: str, content: str
    ) -> List[ContributionOpportunity]:
        opportunities: List[ContributionOpportunity] = []
        lines = content.splitlines()

        for idx, line in enumerate(lines, start=1):
            if len(opportunities) >= 2:  # Limit to 2 TODOs per file
                break
            match = re.search(r"(?:#|//|/\*|<!--)\s*(TODO|FIXME)\s*[:\-]?\s*(.+)", line, re.IGNORECASE)
            if match:
                todo_type = match.group(1).upper()
                text = match.group(2).strip().rstrip("*/-->").strip()
                if len(text) < 5 or "http" in text:
                    continue

                slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower())[:25].strip("-")
                branch_name = f"refactor/{slug}"

                opportunities.append(
                    ContributionOpportunity(
                        id=f"todo-{path.replace('/', '-')}-L{idx}",
                        title=f"{todo_type} in {path}: {text[:50]}",
                        description=f"Line {idx} in {path} contains an explicit note: '{text}'.",
                        difficulty="beginner",
                        type="code-fix",
                        estimatedMinutes=25,
                        sourceBadge=ContributionOpportunityBadge(label="Found in repo"),
                        whyItMatters="Resolves an existing developer note in the codebase to improve overall quality.",
                        targetFiles=[ContributionOpportunityTargetFile(path=path, lines=f"Line {idx}")],
                        steps=[
                            ContributionOpportunityStep(
                                stepNumber=1,
                                instruction=f"Review line {idx} in {path} to understand the developer's intent",
                            ),
                            ContributionOpportunityStep(
                                stepNumber=2,
                                instruction="Create a feature branch for your refactoring",
                                command=f"git checkout -b {branch_name}",
                            ),
                            ContributionOpportunityStep(
                                stepNumber=3,
                                instruction="Implement the resolution and test thoroughly",
                            ),
                        ],
                        maintainerTip="Leave existing comments updated or removed once the task is properly implemented.",
                        safetyRating=90,
                        suggestedBranchName=branch_name,
                        issueUrl=None,
                    )
                )

        return opportunities
