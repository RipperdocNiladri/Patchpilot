from typing import Any, Dict, List, Optional
from app.schemas import FileContentResponse, FileNode, RepositoryMeta
from app.services.demo_data import (
    DEMO_FILES,
    DEMO_FILE_TREE,
    DEMO_OWNER,
    DEMO_REPO,
    DEMO_REPOSITORY_META,
    is_demo_repo,
)
from app.services.github_client import GitHubClient
from fastapi import HTTPException, status


class RepositoryService:
    """Service to coordinate repository information, tree generation, and file retrieval."""

    def __init__(self, github_client: Optional[GitHubClient] = None):
        self.github = github_client or GitHubClient()

    async def get_overview(self, owner: str, repo: str) -> RepositoryMeta:
        # Check built-in demo repository first
        if is_demo_repo(owner, repo):
            return DEMO_REPOSITORY_META

        repo_data = await self.github.get_repository(owner, repo)
        readme_data = await self.github.get_readme(owner, repo)
        tree_items = await self.github.get_tree(owner, repo, repo_data.get("default_branch", "main"))

        # Analyze files
        file_paths = [item.get("path", "") for item in tree_items if item.get("type") == "blob"]
        total_files = len(file_paths) if file_paths else 1

        # Calculate core modules (top-level directories)
        top_dirs = {
            p.split("/")[0] for p in file_paths if "/" in p and not p.startswith((".", "node_modules", "vendor"))
        }
        core_modules_count = len(top_dirs) or 1

        # Determine recommended start file
        recommended_start = self._find_recommended_start(file_paths)

        # Calculate a realistic beginner accessibility score based on available evidence
        has_readme = bool(readme_data and readme_data.get("content"))
        has_license = bool(repo_data.get("license"))
        has_issues_enabled = repo_data.get("has_issues", True)
        score = 60
        if has_readme:
            score += 20
        if has_license:
            score += 10
        if has_issues_enabled and repo_data.get("open_issues_count", 0) > 0:
            score += 10
        score = min(score, 98)

        # Estimated onboarding minutes
        minutes = max(15, min(60, total_files // 2 + 10))

        license_name = "None"
        if repo_data.get("license") and isinstance(repo_data["license"], dict):
            license_name = repo_data["license"].get("spdx_id") or repo_data["license"].get("name") or "Custom"

        readme_text = readme_data.get("content", "") if readme_data else ""

        return RepositoryMeta(
            owner=repo_data.get("owner", {}).get("login", owner),
            name=repo_data.get("name", repo),
            fullName=repo_data.get("full_name", f"{owner}/{repo}"),
            description=repo_data.get("description") or "No description provided.",
            isPublic=not repo_data.get("private", False),
            language=repo_data.get("language") or "Other",
            license=license_name,
            stars=repo_data.get("stargazers_count", 0),
            forks=repo_data.get("forks_count", 0),
            openIssuesCount=repo_data.get("open_issues_count", 0),
            defaultBranch=repo_data.get("default_branch", "main"),
            totalFiles=total_files,
            coreModulesCount=core_modules_count,
            accessibilityScore=score,
            estimatedOnboardingMinutes=minutes,
            recommendedStartFile=recommended_start,
            readme=readme_text[:5000] if readme_text else None,
            topics=repo_data.get("topics", []),
        )

    async def get_tree(self, owner: str, repo: str) -> List[FileNode]:
        """Fetch and build a nested tree structure of files and folders."""
        if is_demo_repo(owner, repo):
            return DEMO_FILE_TREE

        repo_data = await self.github.get_repository(owner, repo)
        branch = repo_data.get("default_branch", "main")
        tree_items = await self.github.get_tree(owner, repo, branch)

        if not tree_items:
            # Fallback for empty or small repo
            return [
                FileNode(
                    name="README.md",
                    path="README.md",
                    type="file",
                    badge="Recommended Start",
                )
            ]

        # Ignore noisy / internal folders
        ignored_prefixes = (".git/", "node_modules/", "vendor/", "__pycache__/", ".venv/", "dist/", "build/")
        filtered = [
            item for item in tree_items
            if not any(item.get("path", "").startswith(p) for p in ignored_prefixes)
        ]

        file_paths = [item.get("path", "") for item in filtered if item.get("type") == "blob"]
        recommended_start = self._find_recommended_start(file_paths)

        return self._build_nested_tree(filtered, recommended_start)

    async def get_file_content(self, owner: str, repo: str, path: str) -> FileContentResponse:
        if is_demo_repo(owner, repo):
            clean_path = path.replace("\\", "/").strip("/")
            if clean_path in DEMO_FILES:
                return DEMO_FILES[clean_path]
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File '{clean_path}' not found on GitHub.",
            )

        data = await self.github.get_file_content(owner, repo, path)
        return FileContentResponse(
            path=data["path"],
            content=data["content"],
            language=data.get("language"),
            size=data.get("size", 0),
            isBinary=data.get("isBinary", False),
            githubUrl=data["githubUrl"],
        )

    def _find_recommended_start(self, file_paths: List[str]) -> str:
        """Heuristically find the best starting file for a beginner."""
        priority_files = [
            "src/index.ts", "src/index.js", "src/main.ts", "src/main.py",
            "app/main.py", "main.py", "app.py", "index.js", "server.js",
            "src/App.tsx", "src/App.jsx", "README.md"
        ]
        for candidate in priority_files:
            if candidate in file_paths:
                return candidate

        # Look for routers, handlers, or entry files
        for path in file_paths:
            lower = path.lower()
            if any(term in lower for term in ("main.", "index.", "app.", "router")):
                return path

        return file_paths[0] if file_paths else "README.md"

    def _build_nested_tree(
        self, items: List[Dict[str, Any]], recommended_path: str
    ) -> List[FileNode]:
        """Convert flat GitHub git tree list into nested FileNode hierarchy."""
        root_map: Dict[str, Any] = {}

        for item in items:
            raw_path = item.get("path", "")
            item_type = "folder" if item.get("type") == "tree" else "file"
            parts = raw_path.split("/")

            curr = root_map
            curr_path = ""
            for i, part in enumerate(parts):
                curr_path = f"{curr_path}/{part}" if curr_path else part
                is_last = (i == len(parts) - 1)

                if part not in curr:
                    curr[part] = {
                        "name": part,
                        "path": curr_path,
                        "type": item_type if is_last else "folder",
                        "size": item.get("size") if is_last else None,
                        "badge": "Recommended Start" if is_last and curr_path == recommended_path else None,
                        "children": {} if (not is_last or item_type == "folder") else None,
                    }
                elif is_last and item_type == "file":
                    curr[part]["type"] = "file"
                    curr[part]["size"] = item.get("size")
                    if curr_path == recommended_path:
                        curr[part]["badge"] = "Recommended Start"

                if not is_last:
                    if curr[part]["children"] is None:
                        curr[part]["children"] = {}
                    curr = curr[part]["children"]

        def dict_to_nodes(d: Dict[str, Any]) -> List[FileNode]:
            nodes = []
            for name, val in d.items():
                children = dict_to_nodes(val["children"]) if val.get("children") is not None else None
                # Sort: folders first, then alphabetical
                nodes.append(
                    FileNode(
                        name=val["name"],
                        path=val["path"],
                        type=val["type"],
                        badge=val.get("badge"),
                        children=children,
                        size=val.get("size"),
                    )
                )
            return sorted(nodes, key=lambda n: (0 if n.type == "folder" else 1, n.name.lower()))

        return dict_to_nodes(root_map)
