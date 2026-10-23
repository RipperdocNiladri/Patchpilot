# 🚀 PatchPilot

> **An AI-powered open-source onboarding assistant that makes understanding unfamiliar GitHub repositories easier.**

**PatchPilot** is an AI-powered open-source onboarding assistant built with Gemma that helps developers navigate unfamiliar GitHub repositories with confidence. It simplifies complex code through beginner-friendly AI explanations, enables interactive exploration and code-related Q&A, and identifies potential open-source contribution opportunities grounded in real repository evidence—making open source more accessible to everyone, especially beginners.
---

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
---

## 📁 Repository Structure

```
Patchpilot/
├── backend/                                  # Python FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                           # FastAPI application entry point, CORS & middleware
│   │   ├── config.py                         # Pydantic BaseSettings & environment validation
│   │   ├── schemas.py                        # Pydantic models matching frontend TypeScript contract
│   │   ├── dependencies.py                   # FastAPI dependency injection providers
│   │   ├── routers/                          # API route definitions
│   │   │   ├── __init__.py
│   │   │   ├── repositories.py               # /api/repositories/{owner}/{repo} (overview, tree, files)
│   │   │   ├── analysis.py                   # /api/analysis (explain, ask)
│   │   │   └── contributions.py              # /api/contributions/{owner}/{repo}
│   │   └── services/                         # Core business logic layer
│   │       ├── __init__.py
│   │       ├── github_client.py              # Async GitHub REST client, rate limits & decoding
│   │       ├── repository_service.py         # Repo metadata, accessibility score & tree builder
│   │       ├── gemma_client.py               # Google Gen AI SDK client for Gemma models
│   │       ├── analysis_service.py           # Grounded code explanations & file Q&A
│   │       ├── contribution_service.py       # GitHub issues & in-code TODO/FIXME discovery
│   │       ├── demo_data.py                  # Built-in offline demo dataset (taskflow-api)
│   │       └── prompts.py                    # Safety-hardened prompts & injection resistance
│   ├── tests/                                # Automated Pytest test suite (20 tests)
│   │   ├── __init__.py
│   │   ├── conftest.py                       # Mock GitHub & Gemma fixtures
│   │   ├── test_health.py                    # Health check, root & CORS tests (Local + Vercel)
│   │   ├── test_github_url.py                # Identifier & path traversal validation tests
│   │   ├── test_repository_endpoints.py      # Metadata, tree & file content tests
│   │   ├── test_analysis_endpoints.py        # Code explanation & file question tests
│   │   └── test_contributions.py             # Issue & repository TODO detection tests
│   ├── requirements.txt                      # Python dependencies (FastAPI, google-genai, httpx, etc.)
│   ├── vercel.json                           # Vercel deployment routing configuration
│   ├── .env.example                          # Environment template
│   ├── .gitignore                            # Python & environment ignore rules
│   └── README.md                             # Backend-specific documentation
│
├── patchpilot-frontend/                      # Next.js App Router Frontend
│   ├── public/                               # Static assets and robots.txt
│   ├── src/
│   │   ├── app/                              # Next.js App Router pages
│   │   │   ├── globals.css                   # Tailwind CSS styling and theme tokens
│   │   │   ├── layout.tsx                    # Root layout with dynamic repository header
│   │   │   ├── page.tsx                      # Landing page with URL search & examples
│   │   │   └── repository/[owner]/[repo]/
│   │   │       ├── page.tsx                  # Repository Overview dashboard
│   │   │       ├── code/page.tsx             # Interactive Code Explorer & Gemma Q&A
│   │   │       └── contributions/page.tsx    # Beginner Contribution Finder
│   │   ├── components/                       # Shared UI Components
│   │   │   └── Header.tsx                    # Dynamic header keeping active repo context
│   │   ├── lib/                              # Frontend utilities
│   │   │   └── api.ts                        # Centralized typed API client & error handling
│   │   ├── types/                            # TypeScript interfaces & API contracts
│   │   │   └── index.ts
│   │   └── data/                             # Reference demo data
│   │       └── demo-repository.ts
│   ├── next.config.ts                        # Next.js configuration
│   ├── tailwind.config.ts                    # Stitch-generated Tailwind theme tokens
│   ├── tsconfig.json                         # TypeScript configuration
│   ├── package.json                          # Frontend dependencies & scripts
│   ├── .env.example                          # Frontend environment template
│   └── .gitignore                            # Node & build ignore rules
│
├── package.json                              # Root workspace scripts (run both frontend & backend)
└── README.md                                 # Main project documentation
```

---

## 💻 Local Development Workflow

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**

### Quickest Way: Root Single Command

From the project root (`E:\Patchpilot`):

```powershell
# 1. Install frontend dependencies
npm --prefix patchpilot-frontend install

# 2. Setup backend virtual environment (one-time)
cd backend
python -m venv .venv
.\.venv\Scripts\pip.exe install -r requirements.txt
Copy-Item .env.example .env
cd ..

# 3. Start BOTH Backend and Frontend together:
npm run dev:all
```

*Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

### Standard Way: Two Terminals

#### Terminal 1 — Backend (Port 8000)
```powershell
cd E:\Patchpilot\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
*Health check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)*

#### Terminal 2 — Frontend (Port 3000)
```powershell
cd E:\Patchpilot\patchpilot-frontend
npm run dev
```
*Web App: [http://localhost:3000](http://localhost:3000)*

---

## 🧪 Running Backend Tests

Run the full automated test suite directly with Python:

```powershell
cd backend
python -m pytest tests -v
```

<<<<<<< HEAD
**20 Automated Tests Covered:**
- Health check & root endpoints
- CORS preflight headers for local development and Vercel cloud deployments (`*.vercel.app`)
- GitHub repository identifier validation and directory traversal protection (`..`, `/`, `\`)
- Repository overview metadata, recursive tree construction, and file retrieval
- Gemma AI explanation parsing, structured JSON formatting, and missing key error handling
- GitHub issue discovery and in-code `TODO`/`FIXME` comment detection

---

## ⚙️ Configuration & Environment Variables

### Backend (`backend/.env` & Vercel Dashboard)

| Variable | Description | Default / Example |
|---|---|---|
| `GEMMA_API_KEY` | Google AI Studio API key | *(Optional, enables live AI)* |
| `GEMMA_MODEL` | Selected model identifier | `gemma-4-26b-a4b-it` |
| `GITHUB_TOKEN` | Optional GitHub Personal Access Token | *(Increases rate limit from 60 to 5,000/hr)* |
| `FRONTEND_ORIGIN` | Allowed CORS origins | `http://localhost:3000` *(Auto-allows `*.vercel.app`)* |
| `HOST` | Backend bind host | `127.0.0.1` (or `0.0.0.0`) |
| `PORT` | Backend port | `8000` |

### Frontend (`patchpilot-frontend/.env.local` & Vercel Dashboard)

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the backend API | `http://localhost:8000` (Local) or `https://backend-three-beta-67.vercel.app` (Cloud) |
| `NEXT_PUBLIC_APP_ENV` | Environment name | `development` |

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/repositories/{owner}/{repo}` | Repository overview, stars, forks, accessibility score & start file |
| `GET` | `/api/repositories/{owner}/{repo}/tree` | Hierarchical file and directory tree |
| `GET` | `/api/repositories/{owner}/{repo}/files?path=...` | Decoded file content and syntax metadata |
| `GET` | `/api/repositories/{owner}/{repo}/contributions` | Candidate beginner contribution opportunities |
| `POST` | `/api/analysis/explain` | Beginner-friendly structured code explanation using Gemma |
| `POST` | `/api/analysis/ask` | Context-grounded Q&A for the active file using Gemma |
=======


All 19 tests verify:
- Health check and CORS configuration
- GitHub repository identifier and file path traversal validation
- Repository overview metadata, tree construction, and file retrieval
- Gemma AI explanation parsing, structured outputs, and unconfigured friendly errors
- Real GitHub issue and in-code TODO contribution opportunity discovery


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
