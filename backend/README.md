# PatchPilot Backend

FastAPI backend service powering PatchPilot — an AI-powered open-source onboarding mentor for beginner developers.

## Features

- **Public GitHub REST API Integration**: Retrieves repository metadata, file trees, file contents, README files, and open community issues without requiring GitHub authentication.
- **Configurable Rate Limits**: Supports optional `GITHUB_TOKEN` to increase rate limit from 60 to 5,000 requests per hour.
- **Google Gen AI / Gemma Integration**: Generates beginner-friendly structured file explanations and answers questions grounded strictly in the source code context.
- **Graceful Offline & Test Mode**: If `GEMMA_API_KEY` is omitted, returns friendly 503 error status while allowing file browsing, trees, and repository metadata to work independently.
- **Contribution Opportunity Discovery**: Scans real GitHub issues (prioritizing `good first issue`, `documentation`, `beginner` labels) and detects in-code `TODO`/`FIXME` comments with exact line references.
- **Security & Path Validation**: Enforces alphanumeric repository names, directory traversal protection (`..`), and file size limits.

## Quickstart (Windows PowerShell)

```powershell
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv .venv

# 3. Activate virtual environment
.\.venv\Scripts\Activate.ps1
# Note: If PowerShell execution policy restricts scripts, run:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Or invoke Python directly: .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create local environment file
Copy-Item .env.example .env

# 6. Start development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Running Tests

```powershell
$env:PYTHONPATH="backend"
pytest backend/tests -v
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `GEMMA_API_KEY` | Google AI / Gemini API key for Gemma model | *(Optional)* |
| `GEMMA_MODEL` | Gemma model identifier | `gemma-4-26b-a4b-it` |
| `GITHUB_TOKEN` | Optional GitHub Personal Access Token | *(Optional)* |
| `FRONTEND_ORIGIN` | Allowed CORS frontend origins | `http://localhost:3000` |
| `HOST` | Backend bind host | `127.0.0.1` |
| `PORT` | Backend port | `8000` |

## API Endpoints

- `GET /api/health`: Health status.
- `GET /api/repositories/{owner}/{repo}`: Repository metadata, statistics, and onboarding score.
- `GET /api/repositories/{owner}/{repo}/tree`: Hierarchical file and folder tree.
- `GET /api/repositories/{owner}/{repo}/files?path=...`: Decoded file content and metadata.
- `GET /api/repositories/{owner}/{repo}/contributions`: Real GitHub issues and in-code TODO opportunities.
- `POST /api/analysis/explain`: Beginner-friendly code explanation (requires `GEMMA_API_KEY`).
- `POST /api/analysis/ask`: Question answering grounded in source file (requires `GEMMA_API_KEY`).
