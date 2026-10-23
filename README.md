# PatchPilot

> AI-Powered Open-Source Onboarding Mentor for Beginner Developers.

PatchPilot turns unfamiliar open-source repositories into clear, guided learning paths. Explore architecture, read code in plain English, and discover verified beginner issues.

## Project Structure

```
Patchpilot/
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py           # FastAPI application entry point & CORS
│   │   ├── config.py         # Settings & environment validation
│   │   ├── schemas.py        # Pydantic data schemas
│   │   ├── dependencies.py   # Dependency injection providers
│   │   ├── routers/          # API route definitions
│   │   │   ├── repositories.py
│   │   │   ├── analysis.py
│   │   │   └── contributions.py
│   │   └── services/         # Core business logic
│   │       ├── github_client.py
│   │       ├── repository_service.py
│   │       ├── gemma_client.py
│   │       ├── analysis_service.py
│   │       ├── contribution_service.py
│   │       └── prompts.py
│   ├── tests/                # Pytest unit & integration test suite
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
└── patchpilot-frontend/      # Next.js App Router Frontend
    ├── src/
    │   ├── app/              # Next.js route pages
    │   │   ├── page.tsx      # Landing page
    │   │   ├── repository/[owner]/[repo]/page.tsx       # Repository Overview
    │   │   ├── repository/[owner]/[repo]/code/page.tsx  # Code Explorer
    │   │   └── repository/[owner]/[repo]/contributions/page.tsx # Contribution Finder
    │   ├── components/       # UI Components (Header, navigation)
    │   ├── lib/              # Centralized API client (api.ts)
    │   └── types/            # TypeScript interfaces
    ├── package.json
    └── .env.example
```

---

## Windows 11 Development Workflow

Open two separate PowerShell terminal windows:

### Terminal 1: Backend Setup & Startup

```powershell
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv .venv

# 3. Activate virtual environment
.\.venv\Scripts\Activate.ps1
# (If execution policies prevent script execution, use:
#  .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000)

# 4. Install dependencies
pip install -r requirements.txt

# 5. Configure environment file
Copy-Item .env.example .env
# Edit .env and optionally add your GEMMA_API_KEY and GITHUB_TOKEN

# 6. Start the FastAPI backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify the backend is live by opening:
[http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### Terminal 2: Frontend Setup & Startup

```powershell
# 1. Navigate to frontend directory
cd patchpilot-frontend

# 2. Install npm packages
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Backend Tests

In your backend terminal:

```powershell
$env:PYTHONPATH="backend"
.\backend\.venv\Scripts\pytest.exe backend\tests -v
```

All 19 tests verify:
- Health check and CORS configuration
- GitHub repository identifier and file path traversal validation
- Repository overview metadata, tree construction, and file retrieval
- Gemma AI explanation parsing, structured outputs, and unconfigured friendly errors
- Real GitHub issue and in-code TODO contribution opportunity discovery
