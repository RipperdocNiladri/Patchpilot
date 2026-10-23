import base64
import re
from typing import Any, Dict, List, Optional
import httpx
from fastapi import HTTPException, status
from app.config import Settings, get_settings


class GitHubClient:
    """Asynchronous client for interacting with the public GitHub REST API."""

    BASE_URL = "https://api.github.com"
    BINARY_EXTENSIONS = {
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svgz",
        ".pdf", ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
        ".exe", ".dll", ".so", ".dylib", ".bin", ".dat",
        ".pyc", ".pyo", ".class", ".o", ".obj",
        ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4", ".wav",
    }

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    @staticmethod
    def validate_identifier(name: str, field_name: str = "name") -> str:
        """Validate repository owner or repository name to prevent SSRF and injection."""
        clean = (name or "").strip()
        if not re.match(r"^[a-zA-Z0-9_.-]+$", clean):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid {field_name}: '{name}'. Must contain only alphanumeric characters, dashes, underscores, and dots.",
            )
        return clean

    @staticmethod
    def validate_file_path(path: str) -> str:
        """Validate and normalize a file path to prevent directory traversal."""
        clean = (path or "").strip().replace("\\", "/")
        # Remove leading slashes
        clean = re.sub(r"^/+", "", clean)
        # Check for path traversal attempts
        parts = clean.split("/")
        if ".." in parts or any(p.startswith("..") for p in parts) or "\x00" in clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file path: path traversal detected.",
            )
        return clean

    def _headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "PatchPilot-App/1.0",
        }
        if self.settings.GITHUB_TOKEN and self.settings.GITHUB_TOKEN.strip():
            headers["Authorization"] = f"Bearer {self.settings.GITHUB_TOKEN.strip()}"
        return headers

    def _handle_error_response(self, response: httpx.Response, context: str):
        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{context} not found on GitHub.",
            )
        if response.status_code == 403:
            remaining = response.headers.get("x-ratelimit-remaining", "0")
            reset_time = response.headers.get("x-ratelimit-reset", "unknown")
            if remaining == "0":
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="GitHub API rate limit exceeded (60 unauthenticated requests/hour). Add a GITHUB_TOKEN to backend/.env for up to 5,000 requests/hour, or explore the built-in demo repository 'fastapi-users/taskflow-api'.",
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden by GitHub API: {response.text[:200]}",
            )
        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"GitHub API returned error ({response.status_code}): {response.text[:200]}",
            )

    async def get_repository(self, owner: str, repo: str) -> Dict[str, Any]:
        """Fetch repository metadata."""
        owner = self.validate_identifier(owner, "owner")
        repo = self.validate_identifier(repo, "repo")

        url = f"{self.BASE_URL}/repos/{owner}/{repo}"
        async with httpx.AsyncClient(timeout=self.settings.GITHUB_API_TIMEOUT) as client:
            try:
                response = await client.get(url, headers=self._headers())
            except httpx.RequestError as exc:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail=f"Unable to reach GitHub API: {str(exc)}",
                )
            self._handle_error_response(response, f"Repository {owner}/{repo}")
            return response.json()

    async def get_readme(self, owner: str, repo: str) -> Optional[Dict[str, Any]]:
        """Fetch repository README if available."""
        owner = self.validate_identifier(owner, "owner")
        repo = self.validate_identifier(repo, "repo")

        url = f"{self.BASE_URL}/repos/{owner}/{repo}/readme"
        async with httpx.AsyncClient(timeout=self.settings.GITHUB_API_TIMEOUT) as client:
            try:
                response = await client.get(url, headers=self._headers())
            except httpx.RequestError:
                return None

            if response.status_code == 404:
                return None
            if response.status_code != 200:
                return None

            data = response.json()
            content = data.get("content", "")
            encoding = data.get("encoding", "")
            decoded = ""
            if encoding == "base64" and content:
                try:
                    decoded = base64.b64decode(content).decode("utf-8", errors="replace")
                except Exception:
                    decoded = ""
            return {
                "name": data.get("name", "README.md"),
                "path": data.get("path", "README.md"),
                "html_url": data.get("html_url", f"https://github.com/{owner}/{repo}"),
                "content": decoded,
            }

    async def get_tree(self, owner: str, repo: str, branch: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch git tree recursively using the git trees API."""
        owner = self.validate_identifier(owner, "owner")
        repo = self.validate_identifier(repo, "repo")

        if not branch:
            repo_data = await self.get_repository(owner, repo)
            branch = repo_data.get("default_branch", "main")

        url = f"{self.BASE_URL}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
        async with httpx.AsyncClient(timeout=self.settings.GITHUB_API_TIMEOUT) as client:
            try:
                response = await client.get(url, headers=self._headers())
            except httpx.RequestError as exc:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail=f"Unable to reach GitHub API for tree: {str(exc)}",
                )

            # If tree API fails (e.g. repo is empty or truncated), fallback to contents API
            if response.status_code == 404:
                return []
            self._handle_error_response(response, f"Tree for {owner}/{repo}")
            data = response.json()
            return data.get("tree", [])

    async def get_file_content(
        self, owner: str, repo: str, path: str, branch: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch raw content for a single file, decoding base64 if needed."""
        owner = self.validate_identifier(owner, "owner")
        repo = self.validate_identifier(repo, "repo")
        path = self.validate_file_path(path)

        url = f"{self.BASE_URL}/repos/{owner}/{repo}/contents/{path}"
        params = {}
        if branch:
            params["ref"] = branch

        async with httpx.AsyncClient(timeout=self.settings.GITHUB_API_TIMEOUT) as client:
            try:
                response = await client.get(url, headers=self._headers(), params=params)
            except httpx.RequestError as exc:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail=f"Unable to reach GitHub API for file content: {str(exc)}",
                )

            self._handle_error_response(response, f"File '{path}'")
            data = response.json()

            if isinstance(data, list):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Path '{path}' is a directory, not a file.",
                )

            file_size = data.get("size", 0)
            if file_size > self.settings.MAX_FILE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds maximum allowed size ({file_size} bytes > {self.settings.MAX_FILE_BYTES} bytes limit).",
                )

            # Check binary extension
            lower_path = path.lower()
            is_binary = any(lower_path.endswith(ext) for ext in self.BINARY_EXTENSIONS)
            content_str = ""

            if not is_binary and data.get("content"):
                encoding = data.get("encoding", "")
                if encoding == "base64":
                    try:
                        raw_bytes = base64.b64decode(data["content"])
                        # Check for null bytes to detect binary
                        if b"\x00" in raw_bytes[:1024]:
                            is_binary = True
                            content_str = "[Binary file cannot be displayed]"
                        else:
                            content_str = raw_bytes.decode("utf-8", errors="replace")
                    except Exception:
                        content_str = "[Unable to decode file content]"
                else:
                    content_str = str(data.get("content", ""))

            # Truncate content if too long
            if len(content_str) > self.settings.MAX_FILE_CONTENT_CHARS:
                content_str = (
                    content_str[: self.settings.MAX_FILE_CONTENT_CHARS]
                    + f"\n\n... [Content truncated at {self.settings.MAX_FILE_CONTENT_CHARS} characters]"
                )

            # Determine language from extension
            ext = lower_path.split(".")[-1] if "." in lower_path else ""
            language_map = {
                "py": "python",
                "ts": "typescript",
                "tsx": "typescript",
                "js": "javascript",
                "jsx": "javascript",
                "json": "json",
                "md": "markdown",
                "rs": "rust",
                "go": "go",
                "java": "java",
                "c": "c",
                "cpp": "cpp",
                "h": "c",
                "hpp": "cpp",
                "html": "html",
                "css": "css",
                "sh": "bash",
                "yaml": "yaml",
                "yml": "yaml",
                "toml": "toml",
                "sql": "sql",
            }
            language = language_map.get(ext, ext or "text")

            return {
                "path": path,
                "content": content_str,
                "language": language,
                "size": file_size,
                "isBinary": is_binary,
                "githubUrl": data.get("html_url") or f"https://github.com/{owner}/{repo}/blob/main/{path}",
            }

    async def get_issues(
        self, owner: str, repo: str, state: str = "open", per_page: int = 30
    ) -> List[Dict[str, Any]]:
        """Fetch open issues for repository, excluding pull requests."""
        owner = self.validate_identifier(owner, "owner")
        repo = self.validate_identifier(repo, "repo")

        url = f"{self.BASE_URL}/repos/{owner}/{repo}/issues"
        params = {"state": state, "per_page": min(per_page, 50)}

        async with httpx.AsyncClient(timeout=self.settings.GITHUB_API_TIMEOUT) as client:
            try:
                response = await client.get(url, headers=self._headers(), params=params)
            except httpx.RequestError as exc:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail=f"Unable to reach GitHub API for issues: {str(exc)}",
                )

            if response.status_code == 404:
                return []
            self._handle_error_response(response, f"Issues for {owner}/{repo}")

            items = response.json()
            if not isinstance(items, list):
                return []

            # Exclude pull requests (GitHub issues endpoint returns PRs unless filtered)
            issues_only = [item for item in items if "pull_request" not in item]
            return issues_only
