import {
  RepositoryMeta,
  FileNode,
  CodeExplanation,
  ContributionOpportunity,
} from "@/types";
import type { FileContentResponse } from "@/lib/api";

export const DEMO_OWNER = "fastapi-users";
export const DEMO_REPO = "taskflow-api";

export function isDemoRepo(owner: string, repo: string): boolean {
  return (
    owner.toLowerCase() === DEMO_OWNER.toLowerCase() &&
    repo.toLowerCase() === DEMO_REPO.toLowerCase()
  );
}

export const DEMO_REPOSITORY: RepositoryMeta = {
  owner: DEMO_OWNER,
  name: DEMO_REPO,
  fullName: `${DEMO_OWNER}/${DEMO_REPO}`,
  description:
    "[Demo Repository] A lightweight asynchronous task processing API with worker queues and webhook dispatches.",
  isPublic: true,
  language: "Python",
  license: "MIT",
  stars: 1420,
  forks: 284,
  openIssuesCount: 18,
  defaultBranch: "main",
  totalFiles: 42,
  coreModulesCount: 6,
  accessibilityScore: 88,
  estimatedOnboardingMinutes: 20,
  recommendedStartFile: "app/routers/tasks.py",
  readme: `# Taskflow API (Demo)

A lightweight asynchronous task processing API with worker queues and webhook dispatches.

## Architecture
- \`app/main.py\`: Application entrypoint
- \`app/routers/tasks.py\`: Asynchronous route handlers for task queues
- \`app/workers/runner.py\`: Background job worker

## Environment Variables
- \`REDIS_HOST\`: Redis host connection
- \`REDIS_PORT\`: Redis port (default 6379)
`,
  topics: ["fastapi", "python", "workers", "async", "demo"],
};

export const DEMO_FILE_TREE: FileNode[] = [
  {
    name: "app",
    path: "app",
    type: "folder",
    children: [
      { name: "main.py", path: "app/main.py", type: "file" },
      {
        name: "routers",
        path: "app/routers",
        type: "folder",
        children: [
          {
            name: "tasks.py",
            path: "app/routers/tasks.py",
            type: "file",
            badge: "Recommended Start",
          },
          { name: "health.py", path: "app/routers/health.py", type: "file" },
        ],
      },
      {
        name: "workers",
        path: "app/workers",
        type: "folder",
        children: [
          { name: "runner.py", path: "app/workers/runner.py", type: "file" },
        ],
      },
    ],
  },
  {
    name: "tests",
    path: "tests",
    type: "folder",
    children: [
      {
        name: "test_tasks.py",
        path: "tests/test_tasks.py",
        type: "file",
      },
    ],
  },
  { name: "README.md", path: "README.md", type: "file" },
  { name: "pyproject.toml", path: "pyproject.toml", type: "file" },
];

export const DEMO_RAW_TASKS_PY = `from fastapi import APIRouter, HTTPException, status
from app.models.task_schema import TaskCreate, TaskResponse
from app.workers.queue import enqueue_background_task

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate):
    """Create a new asynchronous task and push to worker queue."""
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Task title cannot be empty")
    task_id = await enqueue_background_task(payload.dict())
    return {"id": task_id, "status": "queued", "title": payload.title}
`;

export const DEMO_FILES: Record<string, FileContentResponse> = {
  "app/routers/tasks.py": {
    path: "app/routers/tasks.py",
    content: DEMO_RAW_TASKS_PY,
    language: "python",
    size: DEMO_RAW_TASKS_PY.length,
    isBinary: false,
    githubUrl: `https://github.com/${DEMO_OWNER}/${DEMO_REPO}/blob/main/app/routers/tasks.py`,
  },
  "app/main.py": {
    path: "app/main.py",
    content:
      "from fastapi import FastAPI\nfrom app.routers import tasks, health\n\napp = FastAPI(title='TaskFlow API')\napp.include_router(tasks.router)\napp.include_router(health.router)\n",
    language: "python",
    size: 170,
    isBinary: false,
    githubUrl: `https://github.com/${DEMO_OWNER}/${DEMO_REPO}/blob/main/app/main.py`,
  },
  "app/routers/health.py": {
    path: "app/routers/health.py",
    content:
      "from fastapi import APIRouter\n\nrouter = APIRouter(tags=['health'])\n\n@router.get('/health')\nasync def health_check():\n    return {'status': 'ok'}\n",
    language: "python",
    size: 142,
    isBinary: false,
    githubUrl: `https://github.com/${DEMO_OWNER}/${DEMO_REPO}/blob/main/app/routers/health.py`,
  },
  "app/workers/runner.py": {
    path: "app/workers/runner.py",
    content:
      "import asyncio\n\nasync def run_worker_loop():\n    while True:\n        await asyncio.sleep(1)\n",
    language: "python",
    size: 92,
    isBinary: false,
    githubUrl: `https://github.com/${DEMO_OWNER}/${DEMO_REPO}/blob/main/app/workers/runner.py`,
  },
  "tests/test_tasks.py": {
    path: "tests/test_tasks.py",
    content:
      "def test_create_task_empty_title(client):\n    response = client.post('/tasks/', json={'title': ''})\n    assert response.status_code == 400\n",
    language: "python",
    size: 138,
    isBinary: false,
    githubUrl: `https://github.com/${DEMO_OWNER}/${DEMO_REPO}/blob/main/tests/test_tasks.py`,
  },
  "README.md": {
    path: "README.md",
    content: DEMO_REPOSITORY.readme || "# Taskflow API",
    language: "markdown",
    size: (DEMO_REPOSITORY.readme || "").length,
    isBinary: false,
    githubUrl: `https://github.com/${DEMO_OWNER}/${DEMO_REPO}/blob/main/README.md`,
  },
  "pyproject.toml": {
    path: "pyproject.toml",
    content:
      '[project]\nname = "taskflow-api"\nversion = "0.1.0"\ndependencies = ["fastapi", "uvicorn", "redis"]\n',
    language: "toml",
    size: 97,
    isBinary: false,
    githubUrl: `https://github.com/${DEMO_OWNER}/${DEMO_REPO}/blob/main/pyproject.toml`,
  },
};

export const DEMO_CODE_EXPLANATION: CodeExplanation = {
  filePath: "app/routers/tasks.py",
  linesRange: "lines 1-14",
  summary:
    "Defines HTTP route handlers for creating background tasks and pushing them to asynchronous worker queues.",
  rawCode: DEMO_RAW_TASKS_PY,
  focusLines: [7, 8, 9, 10, 11, 12, 13],
  howItWorks: [
    {
      step: 1,
      title: "Creates a router",
      description:
        "Groups all /tasks URLs into an isolated, reusable sub-module.",
      lineRef: "Line 5",
    },
    {
      step: 2,
      title: "Validates incoming data",
      description:
        "FastAPI automatically validates payload structure against the TaskCreate schema.",
      lineRef: "Line 8",
    },
    {
      step: 3,
      title: "Checks requirements",
      description:
        "Rejects blank task titles with an HTTP 400 Bad Request error.",
      lineRef: "Lines 10-11",
    },
    {
      step: 4,
      title: "Delegates to worker",
      description:
        "Pushes the task to Redis queue asynchronously using non-blocking await.",
      lineRef: "Line 12",
    },
  ],
  keyBuildingBlocks: [
    {
      name: '@router.post("/")',
      description: "Listens for HTTP POST requests to create new task items.",
      type: "Decorator",
    },
    {
      name: "create_task()",
      description: "Validates user payload and invokes async worker queueing.",
      type: "Async Function",
    },
  ],
  jargonTerms: [
    {
      term: "Decorator (@)",
      definition:
        "A shortcut syntax in Python that extends a function with extra behavior.",
    },
    {
      term: "Async / Await",
      definition:
        "Enables non-blocking I/O so the server can handle other requests while waiting.",
    },
  ],
  evidenceReferences: ["app/routers/tasks.py: Lines 1-14"],
};

export const DEMO_OPPORTUNITIES: ContributionOpportunity[] = [
  {
    id: "card-a",
    title: "Document Redis environment variables in README and .env.example",
    description:
      "The README mentions Redis connection settings, but REDIS_PASSWORD and REDIS_DB are missing from .env.example.",
    difficulty: "beginner",
    type: "documentation",
    estimatedMinutes: 20,
    sourceBadge: { label: "GitHub #42" },
    whyItMatters:
      "Helps first-time contributors run the project locally without authentication errors.",
    targetFiles: [
      { path: "README.md", lines: "Lines 84 - 96" },
      { path: ".env.example", lines: "Lines 12 - 14" },
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: "Fork and clone the repository locally",
        command: `git clone https://github.com/your-username/${DEMO_REPO}.git`,
      },
      {
        stepNumber: 2,
        instruction: "Create a docs branch",
        command: "git checkout -b docs/add-redis-env-vars",
      },
      {
        stepNumber: 3,
        instruction:
          "Add REDIS_PASSWORD and REDIS_DB to README.md and .env.example",
      },
    ],
    maintainerTip:
      "Keep changes strictly scoped to documentation so maintainers can merge without CI rebuilds.",
    safetyRating: 98,
    suggestedBranchName: "docs/add-redis-env-vars",
    issueUrl: `https://github.com/${DEMO_OWNER}/${DEMO_REPO}/issues/42`,
  },
  {
    id: "card-b",
    title: "Add unit test for whitespace-only task titles in create_task",
    description:
      "tasks.py checks title.strip(), but tests/test_tasks.py only tests empty strings, not whitespace.",
    difficulty: "beginner",
    type: "unit-test",
    estimatedMinutes: 30,
    sourceBadge: { label: "Found in repo" },
    whyItMatters:
      "Guarantees test coverage for edge cases and avoids payload regressions.",
    targetFiles: [{ path: "tests/test_tasks.py", lines: "Lines 32 - 45" }],
    steps: [
      {
        stepNumber: 1,
        instruction: "Create a test branch",
        command: "git checkout -b test/whitespace-validation",
      },
      {
        stepNumber: 2,
        instruction: "Add test_create_task_whitespace_only test case",
      },
      {
        stepNumber: 3,
        instruction: "Run pytest",
        command: "pytest tests/test_tasks.py",
      },
    ],
    maintainerTip:
      "Use existing pytest fixtures to keep assertions consistent.",
    safetyRating: 95,
    suggestedBranchName: "test/whitespace-validation",
  },
];
