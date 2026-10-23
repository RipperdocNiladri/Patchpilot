# 🚀 PatchPilot

**An AI-powered open-source onboarding assistant that makes understanding unfamiliar GitHub repositories easier.**

PatchPilot helps developers explore repositories, understand code through beginner-friendly AI explanations, ask questions about source files, and discover potential open-source contribution opportunities.

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

## 🛠️ Tech Stack

### Frontend
- **[Next.js](https://nextjs.org/)** — React framework for building the web application.
- **[React](https://react.dev/)** — Component-based user interface.
- **[TypeScript](https://www.typescriptlang.org/)** — Type-safe JavaScript development.
- **[Tailwind CSS](https://tailwindcss.com/)** — Utility-first styling for a responsive, modern UI.
- **[Vercel](https://vercel.com/)** — Frontend deployment and hosting.

### Backend
- **[Python](https://www.python.org/)** — Backend development and AI integration.
- **[FastAPI](https://fastapi.tiangolo.com/)** — REST API for connecting the frontend, GitHub data, and AI services.
- **[Pydantic](https://docs.pydantic.dev/)** — Request validation and configuration management.

### AI & APIs
- **[Gemma](https://ai.google.dev/gemma)** — Google's open Gemma model family, used through a compatible hosted API to generate code explanations and answer repository-related questions.
- **[GitHub REST API](https://docs.github.com/en/rest)** — Retrieves repository metadata, file trees, source files, README content, and issue information.
- **HTTPX** — Makes asynchronous HTTP requests from the Python backend.

*API availability and supported model identifiers depend on the selected provider and deployment configuration.*

### Development & Deployment Tools
- **[Google Antigravity](https://antigravity.google/)** — AI-assisted development environment used to help implement, debug, and integrate the frontend and backend.
- **[Stitch](https://stitch.withgoogle.com/)** — Assisted with the initial UI/UX design and interface generation.
- **[Git](https://git-scm.com/)** and **[GitHub](https://github.com/)** — Version control and source code management.
- **[Vercel](https://vercel.com/)** — Hosting for the Next.js frontend.

## 🧠 How It Works

1. **Enter a repository:** Provide a public GitHub repository URL.
2. **Fetch repository data:** The backend uses the GitHub REST API to retrieve relevant project information and source files.
3. **Analyze with AI:** Relevant code context is sent to the configured Gemma API for explanations and question answering.
4. **Explore the code:** Read beginner-friendly explanations and investigate important files and functions.
5. **Find contribution opportunities:** Review potential improvements grounded in repository files, existing issues, documentation, and tests.

## 🏗️ Architecture

```text
User
  |
  v
Next.js + React + TypeScript
  |
  v
FastAPI Backend (Python)
  |
  +------> GitHub REST API
  |        Repository data and issues
  |
  +------> Gemma API
           AI code explanations and Q&A
  |
  v
Results displayed in PatchPilot
```

## 🔐 Security

- API credentials are stored in server-side environment variables.
- Private API keys should never be exposed through `NEXT_PUBLIC_` variables.
- Repository content is analyzed as data and should never be executed by the application.
- AI-generated suggestions should be verified against actual repository evidence before being treated as actionable recommendations.

## 🤖 AI-Assisted Development

PatchPilot was developed with assistance from **Google Antigravity**, an AI-assisted development environment. It helped with implementation, code generation, debugging, and integrating different parts of the application.

The project combines AI-assisted development with hands-on configuration, testing, and integration to build a practical developer tool.

## 🎯 Project Goal

The goal of PatchPilot is to lower the barrier to open-source contribution by helping students and beginner developers understand unfamiliar codebases, learn from real-world projects, and identify meaningful ways to contribute.

---
