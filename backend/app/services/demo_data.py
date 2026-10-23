"""Built-in demo repository dataset to provide instant offline/demo capability."""

from app.schemas import (
    CodeExplanation,
    CodeExplanationBuildingBlock,
    CodeExplanationHowItWorks,
    CodeExplanationJargon,
    ContributionOpportunity,
    ContributionOpportunityBadge,
    ContributionOpportunityStep,
    ContributionOpportunityTargetFile,
    FileContentResponse,
    FileNode,
    RepositoryMeta,
)

DEMO_OWNER = "fastapi-users"
DEMO_REPO = "taskflow-api"


def is_demo_repo(owner: str, repo: str) -> bool:
    return owner.lower() == DEMO_OWNER.lower() and repo.lower() == DEMO_REPO.lower()


DEMO_REPOSITORY_META = RepositoryMeta(
    owner=DEMO_OWNER,
    name=DEMO_REPO,
    fullName=f"{DEMO_OWNER}/{DEMO_REPO}",
    description="[Demo Repository] A lightweight asynchronous task processing API with worker queues and webhook dispatches.",
    isPublic=True,
    language="Python",
    license="MIT",
    stars=1420,
    forks=284,
    openIssuesCount=18,
    defaultBranch="main",
    totalFiles=42,
    coreModulesCount=6,
    accessibilityScore=88,
    estimatedOnboardingMinutes=20,
    recommendedStartFile="app/routers/tasks.py",
    readme="""# Taskflow API (Demo)

A lightweight asynchronous task processing API with worker queues and webhook dispatches.

## Architecture
- `app/main.py`: Application entrypoint
- `app/routers/tasks.py`: Asynchronous route handlers for task queues
- `app/workers/runner.py`: Background job worker

## Environment Variables
- `REDIS_HOST`: Redis host connection
- `REDIS_PORT`: Redis port (default 6379)
""",
    topics=["fastapi", "python", "workers", "async", "demo"],
)

DEMO_FILE_TREE = [
    FileNode(
        name="app",
        path="app",
        type="folder",
        children=[
            FileNode(name="main.py", path="app/main.py", type="file"),
            FileNode(
                name="routers",
                path="app/routers",
                type="folder",
                children=[
                    FileNode(
                        name="tasks.py",
                        path="app/routers/tasks.py",
                        type="file",
                        badge="Recommended Start",
                    ),
                    FileNode(name="health.py", path="app/routers/health.py", type="file"),
                ],
            ),
            FileNode(
                name="workers",
                path="app/workers",
                type="folder",
                children=[
                    FileNode(name="runner.py", path="app/workers/runner.py", type="file"),
                ],
            ),
        ],
    ),
    FileNode(
        name="tests",
        path="tests",
        type="folder",
        children=[
            FileNode(name="test_tasks.py", path="tests/test_tasks.py", type="file"),
        ],
    ),
    FileNode(name="README.md", path="README.md", type="file"),
    FileNode(name="pyproject.toml", path="pyproject.toml", type="file"),
]

DEMO_RAW_TASKS_PY = """from fastapi import APIRouter, HTTPException, status
from app.models.task_schema import TaskCreate, TaskResponse
from app.workers.queue import enqueue_background_task

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate):
    \"\"\"Create a new asynchronous task and push to worker queue.\"\"\"
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Task title cannot be empty")
    task_id = await enqueue_background_task(payload.dict())
    return {"id": task_id, "status": "queued", "title": payload.title}
"""

DEMO_FILES = {
    "app/routers/tasks.py": FileContentResponse(
        path="app/routers/tasks.py",
        content=DEMO_RAW_TASKS_PY,
        language="python",
        size=len(DEMO_RAW_TASKS_PY),
        isBinary=False,
        githubUrl=f"https://github.com/{DEMO_OWNER}/{DEMO_REPO}/blob/main/app/routers/tasks.py",
    ),
    "app/main.py": FileContentResponse(
        path="app/main.py",
        content="from fastapi import FastAPI\nfrom app.routers import tasks, health\n\napp = FastAPI(title='TaskFlow API')\napp.include_router(tasks.router)\napp.include_router(health.router)\n",
        language="python",
        size=170,
        isBinary=False,
        githubUrl=f"https://github.com/{DEMO_OWNER}/{DEMO_REPO}/blob/main/app/main.py",
    ),
    "README.md": FileContentResponse(
        path="README.md",
        content=DEMO_REPOSITORY_META.readme or "# Taskflow API",
        language="markdown",
        size=len(DEMO_REPOSITORY_META.readme or ""),
        isBinary=False,
        githubUrl=f"https://github.com/{DEMO_OWNER}/{DEMO_REPO}/blob/main/README.md",
    ),
}

DEMO_CODE_EXPLANATION = CodeExplanation(
    filePath="app/routers/tasks.py",
    linesRange="lines 1-14",
    rawCode=DEMO_RAW_TASKS_PY,
    summary="Defines HTTP route handlers for creating background tasks and pushing them to asynchronous worker queues.",
    focusLines=[7, 8, 9, 10, 11, 12, 13],
    howItWorks=[
        CodeExplanationHowItWorks(
            step=1,
            title="Creates a router",
            description="Groups all /tasks URLs into an isolated, reusable sub-module.",
            lineRef="Line 5",
        ),
        CodeExplanationHowItWorks(
            step=2,
            title="Validates incoming data",
            description="FastAPI automatically validates payload structure against the TaskCreate schema.",
            lineRef="Line 8",
        ),
        CodeExplanationHowItWorks(
            step=3,
            title="Checks requirements",
            description="Rejects blank task titles with an HTTP 400 Bad Request error.",
            lineRef="Lines 10-11",
        ),
        CodeExplanationHowItWorks(
            step=4,
            title="Delegates to worker",
            description="Pushes the task to Redis queue asynchronously using non-blocking await.",
            lineRef="Line 12",
        ),
    ],
    keyBuildingBlocks=[
        CodeExplanationBuildingBlock(
            name='@router.post("/")',
            description="Listens for HTTP POST requests to create new task items.",
            type="Decorator",
        ),
        CodeExplanationBuildingBlock(
            name="create_task()",
            description="Validates user payload and invokes async worker queueing.",
            type="Async Function",
        ),
    ],
    jargonTerms=[
        CodeExplanationJargon(
            term="Decorator (@)",
            definition="A shortcut syntax in Python that extends a function with extra behavior.",
        ),
        CodeExplanationJargon(
            term="Async / Await",
            definition="Enables non-blocking I/O so the server can handle other requests while waiting.",
        ),
    ],
    evidenceReferences=["app/routers/tasks.py: Lines 1-14"],
)

DEMO_OPPORTUNITIES = [
    ContributionOpportunity(
        id="card-a",
        title="Document Redis environment variables in README and .env.example",
        description="The README mentions Redis connection settings, but REDIS_PASSWORD and REDIS_DB are missing from .env.example.",
        difficulty="beginner",
        type="documentation",
        estimatedMinutes=20,
        sourceBadge=ContributionOpportunityBadge(label="GitHub #42"),
        whyItMatters="Helps first-time contributors run the project locally without authentication errors.",
        targetFiles=[
            ContributionOpportunityTargetFile(path="README.md", lines="Lines 84 - 96"),
            ContributionOpportunityTargetFile(path=".env.example", lines="Lines 12 - 14"),
        ],
        steps=[
            ContributionOpportunityStep(
                stepNumber=1,
                instruction="Fork and clone the repository locally",
                command=f"git clone https://github.com/your-username/{DEMO_REPO}.git",
            ),
            ContributionOpportunityStep(
                stepNumber=2,
                instruction="Create a docs branch",
                command="git checkout -b docs/add-redis-env-vars",
            ),
            ContributionOpportunityStep(
                stepNumber=3,
                instruction="Add REDIS_PASSWORD and REDIS_DB to README.md and .env.example",
            ),
        ],
        maintainerTip="Keep changes strictly scoped to documentation so maintainers can merge without CI rebuilds.",
        safetyRating=98,
        suggestedBranchName="docs/add-redis-env-vars",
        issueUrl=f"https://github.com/{DEMO_OWNER}/{DEMO_REPO}/issues/42",
    ),
    ContributionOpportunity(
        id="card-b",
        title="Add unit test for whitespace-only task titles in create_task",
        description="tasks.py checks title.strip(), but tests/test_tasks.py only tests empty strings, not whitespace.",
        difficulty="beginner",
        type="unit-test",
        estimatedMinutes=30,
        sourceBadge=ContributionOpportunityBadge(label="Found in repo"),
        whyItMatters="Guarantees test coverage for edge cases and avoids payload regressions.",
        targetFiles=[
            ContributionOpportunityTargetFile(path="tests/test_tasks.py", lines="Lines 32 - 45"),
        ],
        steps=[
            ContributionOpportunityStep(
                stepNumber=1,
                instruction="Create a test branch",
                command="git checkout -b test/whitespace-validation",
            ),
            ContributionOpportunityStep(
                stepNumber=2,
                instruction="Add test_create_task_whitespace_only test case",
            ),
            ContributionOpportunityStep(
                stepNumber=3,
                instruction="Run pytest",
                command="pytest tests/test_tasks.py",
            ),
        ],
        maintainerTip="Use existing pytest fixtures to keep assertions consistent.",
        safetyRating=95,
        suggestedBranchName="test/whitespace-validation",
        issueUrl=None,
    ),
]
