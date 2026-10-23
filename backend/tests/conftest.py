import pytest
from typing import Any, Dict, List, Optional
from fastapi.testclient import TestClient
from app.config import Settings
from app.dependencies import get_gemma_client, get_github_client
from app.main import app
from app.services.gemma_client import GemmaClient
from app.services.github_client import GitHubClient


class MockGitHubClient(GitHubClient):
    """Mock GitHub client returning deterministic fixtures for testing."""

    def __init__(self, settings: Optional[Settings] = None):
        super().__init__(settings or Settings())
        self.mock_repo: Dict[str, Any] = {
            "name": "taskflow-api",
            "full_name": "fastapi-users/taskflow-api",
            "description": "A lightweight asynchronous task processing API.",
            "private": False,
            "language": "Python",
            "license": {"spdx_id": "MIT", "name": "MIT License"},
            "stargazers_count": 1420,
            "forks_count": 284,
            "open_issues_count": 5,
            "default_branch": "main",
            "has_issues": True,
            "owner": {"login": "fastapi-users"},
            "topics": ["fastapi", "async", "python"],
        }
        self.mock_readme: Dict[str, Any] = {
            "name": "README.md",
            "path": "README.md",
            "html_url": "https://github.com/fastapi-users/taskflow-api/blob/main/README.md",
            "content": "# Taskflow API\n\nRun tasks in background.\n\n## Environment Variables\n- REDIS_HOST\n",
        }
        self.mock_tree: List[Dict[str, Any]] = [
            {"path": "app", "type": "tree"},
            {"path": "app/main.py", "type": "blob", "size": 450},
            {"path": "app/routers", "type": "tree"},
            {"path": "app/routers/tasks.py", "type": "blob", "size": 850},
            {"path": "README.md", "type": "blob", "size": 320},
            {"path": "tests", "type": "tree"},
            {"path": "tests/test_tasks.py", "type": "blob", "size": 500},
        ]
        self.mock_files: Dict[str, Dict[str, Any]] = {
            "app/main.py": {
                "path": "app/main.py",
                "content": "from fastapi import FastAPI\napp = FastAPI()\n# TODO: Add global error handlers\n",
                "language": "python",
                "size": 75,
                "isBinary": False,
                "githubUrl": "https://github.com/fastapi-users/taskflow-api/blob/main/app/main.py",
            },
            "app/routers/tasks.py": {
                "path": "app/routers/tasks.py",
                "content": "from fastapi import APIRouter\nrouter = APIRouter()\n\n@router.post('/')\nasync def create_task():\n    return {'status': 'queued'}\n",
                "language": "python",
                "size": 130,
                "isBinary": False,
                "githubUrl": "https://github.com/fastapi-users/taskflow-api/blob/main/app/routers/tasks.py",
            },
            "README.md": {
                "path": "README.md",
                "content": "# Taskflow API\n\nRun tasks in background.\n",
                "language": "markdown",
                "size": 42,
                "isBinary": False,
                "githubUrl": "https://github.com/fastapi-users/taskflow-api/blob/main/README.md",
            },
        }
        self.mock_issues: List[Dict[str, Any]] = [
            {
                "number": 42,
                "title": "Document Redis environment variables in README",
                "body": "Please add REDIS_PASSWORD and REDIS_DB to .env.example and README.md.",
                "html_url": "https://github.com/fastapi-users/taskflow-api/issues/42",
                "labels": [{"name": "good first issue"}, {"name": "documentation"}],
            },
            {
                "number": 43,
                "title": "Add test for whitespace title",
                "body": "Need a test in tests/test_tasks.py for blank strings.",
                "html_url": "https://github.com/fastapi-users/taskflow-api/issues/43",
                "labels": [{"name": "tests"}, {"name": "beginner"}],
            },
        ]

    async def get_repository(self, owner: str, repo: str) -> Dict[str, Any]:
        self.validate_identifier(owner, "owner")
        self.validate_identifier(repo, "repo")
        if owner == "nonexistent" or repo == "missing-repo":
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Repository not found on GitHub.")
        return dict(self.mock_repo)

    async def get_readme(self, owner: str, repo: str) -> Optional[Dict[str, Any]]:
        self.validate_identifier(owner, "owner")
        self.validate_identifier(repo, "repo")
        return dict(self.mock_readme)

    async def get_tree(self, owner: str, repo: str, branch: Optional[str] = None) -> List[Dict[str, Any]]:
        self.validate_identifier(owner, "owner")
        self.validate_identifier(repo, "repo")
        return list(self.mock_tree)

    async def get_file_content(
        self, owner: str, repo: str, path: str, branch: Optional[str] = None
    ) -> Dict[str, Any]:
        self.validate_identifier(owner, "owner")
        self.validate_identifier(repo, "repo")
        clean_path = self.validate_file_path(path)
        if clean_path in self.mock_files:
            return dict(self.mock_files[clean_path])
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"File '{clean_path}' not found on GitHub.")

    async def get_issues(
        self, owner: str, repo: str, state: str = "open", per_page: int = 30
    ) -> List[Dict[str, Any]]:
        self.validate_identifier(owner, "owner")
        self.validate_identifier(repo, "repo")
        return list(self.mock_issues)


class MockGemmaClient(GemmaClient):
    """Mock Gemma AI client returning structured mock outputs for tests."""

    def __init__(self, configured: bool = True):
        super().__init__(Settings(GEMMA_API_KEY="test-key" if configured else None))
        self._configured = configured

    @property
    def is_configured(self) -> bool:
        return self._configured

    async def generate_json(self, prompt: str, system_instruction: str = "") -> Dict[str, Any]:
        if not self._configured:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=503,
                detail="Gemma AI is not configured. Set GEMMA_API_KEY in backend/.env to enable AI features.",
            )
        # Return structured explanation or answer based on prompt
        if "question" in prompt.lower():
            return {
                "answer": "This function handles HTTP POST requests to create a new task asynchronously.",
                "evidence": "Line 4: async def create_task()",
                "filePath": "app/routers/tasks.py",
            }
        return {
            "summary": "Defines asynchronous router endpoints for task processing.",
            "focusLines": [4, 5],
            "howItWorks": [
                {
                    "step": 1,
                    "title": "Define Router",
                    "description": "Initializes APIRouter for tasks module.",
                    "lineRef": "Line 2",
                },
                {
                    "step": 2,
                    "title": "Endpoint Handler",
                    "description": "Registers create_task route.",
                    "lineRef": "Lines 4-5",
                },
            ],
            "keyBuildingBlocks": [
                {
                    "name": "create_task",
                    "description": "Handles task creation",
                    "type": "Function",
                }
            ],
            "jargonTerms": [
                {
                    "term": "Async",
                    "definition": "Executes non-blocking operations concurrently.",
                }
            ],
            "evidenceReferences": ["app/routers/tasks.py:4"],
        }


@pytest.fixture
def mock_github():
    return MockGitHubClient()


@pytest.fixture
def mock_gemma():
    return MockGemmaClient(configured=True)


@pytest.fixture
def client(mock_github, mock_gemma):
    app.dependency_overrides[get_github_client] = lambda: mock_github
    app.dependency_overrides[get_gemma_client] = lambda: mock_gemma
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
