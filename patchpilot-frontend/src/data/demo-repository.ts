import { RepositoryMeta, FileNode, CodeExplanation, ContributionOpportunity } from "@/types";
export const DEMO_REPOSITORY: RepositoryMeta = {
  owner: "fastapi-users", name: "taskflow-api", fullName: "fastapi-users/taskflow-api",
  description: "A lightweight asynchronous task processing API with worker queues and webhook dispatches.",
  isPublic: true, language: "Python", license: "MIT", stars: 1420, forks: 284,
  openIssuesCount: 18, defaultBranch: "main", totalFiles: 42, coreModulesCount: 6,
  accessibilityScore: 88, estimatedOnboardingMinutes: 20, recommendedStartFile: "app/routers/tasks.py"
};
export const DEMO_FILE_TREE: FileNode[] = [
  {
    name: "app", path: "app", type: "folder",
    children: [
      { name: "main.py", path: "app/main.py", type: "file" },
      {
        name: "routers", path: "app/routers", type: "folder",
        children: [
          { name: "tasks.py", path: "app/routers/tasks.py", type: "file", badge: "Recommended Start" },
          { name: "health.py", path: "app/routers/health.py", type: "file" }
        ]
      },
      { name: "workers", path: "app/workers", type: "folder", children: [{ name: "runner.py", path: "app/workers/runner.py", type: "file" }] }
    ]
  },
  { name: "tests", path: "tests", type: "folder", children: [{ name: "test_tasks.py", path: "tests/test_tasks.py", type: "file" }] },
  { name: "README.md", path: "README.md", type: "file" },
  { name: "pyproject.toml", path: "pyproject.toml", type: "file" }
];
export const DEMO_CODE_EXPLANATION: CodeExplanation = {
  filePath: "app/routers/tasks.py", linesRange: "lines 1-14",
  summary: "Defines HTTP route handlers for creating background tasks and querying their execution status.",
  rawCode: `from fastapi import APIRouter, HTTPException, status
from app.models.task_schema import TaskCreate, TaskResponse
from app.workers.queue import enqueue_background_task

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate):
    """Create a new asynchronous task and push to worker queue."""
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Task title cannot be empty")
    task_id = await enqueue_background_task(payload.dict())
    return {"id": task_id, "status": "queued", "title": payload.title}`,
  focusLines: [8, 9, 10, 11, 12, 13, 14],
  howItWorks: [
    { step: 1, title: "Creates a router", description: "Groups /tasks URLs into a clean sub-module.", lineRef: "Line 6" },
    { step: 2, title: "Validates incoming data", description: "FastAPI checks payload structure against TaskCreate.", lineRef: "Line 9" },
    { step: 3, title: "Checks requirements", description: "Rejects blank titles with HTTP 400 Bad Request.", lineRef: "Lines 11-12" },
    { step: 4, title: "Delegates to worker", description: "Pushes task to Redis queue asynchronously.", lineRef: "Line 13" }
  ],
  keyBuildingBlocks: [
    { name: '@router.post("/")', description: "Listens for HTTP POST requests to create items.", type: "Decorator" },
    { name: "create_task()", description: "Validates payload and invokes worker queueing.", type: "Async Function" }
  ],
  jargonTerms: [
    { term: "Decorator (@)", definition: "A shortcut syntax in Python that extends a function with extra behavior." },
    { term: "Async / Await", definition: "Enables non-blocking I/O so the server can handle other requests while waiting." }
  ]
};
export const DEMO_OPPORTUNITIES: ContributionOpportunity[] = [
  {
    id: "card-a", title: "Document Redis environment variables in README and .env.example",
    description: "The README mentions Redis connection settings, but REDIS_PASSWORD and REDIS_DB are missing from .env.example.",
    difficulty: "beginner", type: "documentation", estimatedMinutes: 20, sourceBadge: { label: "GitHub #42" },
    whyItMatters: "Helps first-time contributors run the project locally without authentication errors.",
    targetFiles: [{ path: "README.md", lines: "Lines 84 - 96" }, { path: ".env.example", lines: "Lines 12 - 14" }],
    steps: [
      { stepNumber: 1, instruction: "Fork and clone the repository", command: "git clone https://github.com/your-username/taskflow-api.git" },
      { stepNumber: 2, instruction: "Create a branch", command: "git checkout -b docs/add-redis-env-vars" },
      { stepNumber: 3, instruction: "Add REDIS_PASSWORD and REDIS_DB to README.md and .env.example" }
    ],
    maintainerTip: "Keep changes strictly scoped to documentation so maintainers can merge without CI rebuilds.",
    safetyRating: 98, suggestedBranchName: "docs/add-redis-env-vars"
  },
  {
    id: "card-b", title: "Add unit test for whitespace-only task titles in create_task",
    description: "tasks.py checks title.strip(), but tests/test_tasks.py only tests empty strings, not whitespace.",
    difficulty: "beginner", type: "unit-test", estimatedMinutes: 30, sourceBadge: { label: "Found in repo" },
    whyItMatters: "Guarantees test coverage for edge cases and avoids payload regressions.",
    targetFiles: [{ path: "tests/test_tasks.py", lines: "Lines 32 - 45" }],
    steps: [
      { stepNumber: 1, instruction: "Create a test branch", command: "git checkout -b test/whitespace-validation" },
      { stepNumber: 2, instruction: "Add test_create_task_whitespace_only test case" },
      { stepNumber: 3, instruction: "Run pytest", command: "pytest tests/test_tasks.py" }
    ],
    maintainerTip: "Use existing pytest fixtures to keep assertions consistent.",
    safetyRating: 95, suggestedBranchName: "test/whitespace-validation"
  }
];