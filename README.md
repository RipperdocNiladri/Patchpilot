# 🚀 PatchPilot

> **An AI-powered open-source onboarding assistant that makes understanding unfamiliar GitHub repositories easier.**

PatchPilot helps developers explore repositories, understand code through beginner-friendly AI explanations, ask questions about source files, and discover potential open-source contribution opportunities grounded in real repository evidence.

---

## ✨ Key Features

- **Repository Blueprint & Overview**: Inspect repository metadata, programming language, license, star/fork/issue counts, top-level module structure, beginner accessibility score, and a recommended starting file.
- **Interactive Code Explorer**: Browse the full repository file tree and inspect syntax-aware source files directly in the browser.
- **Explained Simply (Gemma AI)**: Generate structured, plain-English explanations of source files, including step-by-step execution flow, key building blocks, and beginner definitions of technical jargon.
- **Grounded File Q&A**: Ask specific questions about any open source file and receive answers strictly grounded in the file's source code with line-level evidence.
- **First Contribution Finder**: Automatically surface candidate beginner contributions from real open GitHub issues (`good first issue`, `help wanted`, documentation, tests) and in-code `TODO` / `FIXME` notes, complete with safe step-by-step Git workflows.
- **Built-In Demo Repository**: Explore `fastapi-users/taskflow-api` out of the box with zero external API keys required.

---

## 🛠️ Tech Stack

### Full-Stack Application (Frontend & Server API)
- **[Next.js](https://nextjs.org/)** — App Router framework powering both the React UI and full-stack server-side Route Handlers (`/api/*`).
- **[React](https://react.dev/)** — Component-based user interface.
- **[TypeScript](https://www.typescriptlang.org/)** — End-to-end type-safe client and server development.
- **[Tailwind CSS](https://tailwindcss.com/)** — Utility-first styling for a responsive, modern UI.
- **[Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)** — Unified serverless backend routes for repository ingestion, AI analysis, and contribution discovery.

### AI & External APIs
- **[Gemma](https://ai.google.dev/gemma)** — Google's open Gemma model family (`gemma-4-26b-a4b-it`), used via the Google Generative Language API to generate beginner-friendly code explanations and answer repository-grounded questions.
- **[GitHub REST API](https://docs.github.com/en/rest)** — Retrieves repository metadata, recursive git trees, base64-decoded source files, README content, and open issue information.

*API availability and supported model identifiers depend on the selected provider and deployment configuration.*

### Development & Deployment Tools
- **[Google Antigravity](https://antigravity.google/)** — AI-assisted development environment used to help implement, debug, refactor, and integrate the full-stack application.
- **[Stitch](https://stitch.withgoogle.com/)** — Assisted with the initial UI/UX design and interface generation.
- **[Vitest](https://vitest.dev/)** — Fast TypeScript unit and route handler test suite.
- **[Git](https://git-scm.com/)** and **[GitHub](https://github.com/)** — Version control and source code management.
- **[Vercel](https://vercel.com/)** — Unified hosting for both the Next.js frontend and serverless API routes.

---

## 🧠 How It Works

1. **Enter a repository**: Provide a public GitHub repository URL (`https://github.com/owner/repo`) or shorthand (`owner/repo`).
2. **Fetch repository data**: Next.js server-side API routes query the GitHub REST API to retrieve project metadata, README content, file trees, and source files.
3. **Analyze with AI**: Relevant code context is sent from the server to the configured Gemma API for structured explanations and question answering.
4. **Explore the code**: Read beginner-friendly explanations and investigate important files and functions in the Code Explorer.
5. **Find contribution opportunities**: Review actionable beginner tasks grounded in open GitHub issues, documentation, tests, and repository `TODO`/`FIXME` comments.

---

## 🏗️ Architecture

```text
User Browser
  │
  ▼
Next.js App Router UI (React + TypeScript + Tailwind CSS)
  │  (Same-origin requests: /api/*)
  ▼
Next.js Server API Route Handlers (src/app/api/*)
  │
  ├──────► GitHub REST API
  │        Repository metadata, recursive file trees, source files & issues
  │
  └──────► Gemma API (Google Generative Language API)
           Structured AI code explanations & grounded file Q&A
  │
  ▼
Results displayed in PatchPilot
```
---

## 📁 Repository Structure

```text
Patchpilot/
├── public/                                   # Static public assets
│   └── robots.txt
│
├── src/
│   ├── app/
│   │   ├── api/                              # Next.js Full-Stack Server API Route Handlers
│   │   │   ├── health/route.ts               # GET /api/health
│   │   │   ├── repositories/
│   │   │   │   └── [owner]/[repo]/
│   │   │   │       ├── route.ts              # GET /api/repositories/[owner]/[repo]
│   │   │   │       ├── tree/route.ts         # GET /api/repositories/[owner]/[repo]/tree
│   │   │   │       ├── files/route.ts        # GET /api/repositories/[owner]/[repo]/files?path=...
│   │   │   │       └── contributions/route.ts# GET /api/repositories/[owner]/[repo]/contributions
│   │   │   ├── analysis/
│   │   │   │   ├── explain/route.ts          # POST /api/analysis/explain
│   │   │   │   └── ask/route.ts              # POST /api/analysis/ask
│   │   │   └── contributions/
│   │   │       └── [owner]/[repo]/route.ts   # GET /api/contributions/[owner]/[repo]
│   │   │
│   │   ├── repository/[owner]/[repo]/        # Dynamic Repository Pages
│   │   │   ├── page.tsx                      # Repository Overview dashboard
│   │   │   ├── code/page.tsx                 # Interactive Code Explorer & Gemma Q&A
│   │   │   └── contributions/page.tsx        # First Contribution Finder
│   │   │
│   │   ├── globals.css                       # Global styles & Tailwind directives
│   │   ├── layout.tsx                        # Root application layout & header
│   │   └── page.tsx                          # Landing page with repo search & examples
│   │
│   ├── components/
│   │   └── Header.tsx                        # Dynamic navigation header
│   │
│   ├── lib/
│   │   ├── api.ts                            # Same-origin typed client API wrapper
│   │   ├── env.ts                            # Server-side environment configuration
│   │   ├── validation.ts                     # SSRF, path traversal & payload validation
│   │   ├── github/
│   │   │   ├── client.ts                     # Server-side GitHub REST API client
│   │   │   └── repositories.ts               # Metadata, accessibility score & tree builder
│   │   ├── ai/
│   │   │   ├── gemma.ts                      # Server-side Gemma API client
│   │   │   ├── analysis.ts                   # Grounded code explanation & Q&A service
│   │   │   └── prompts.ts                    # Prompt injection-resistant templates
│   │   └── contributions/
│   │       └── analyzer.ts                   # GitHub issues & in-code TODO/FIXME analyzer
│   │
│   ├── types/
│   │   └── index.ts                          # Shared TypeScript interfaces
│   │
│   └── data/
│       └── demo-repository.ts                # Built-in offline demo dataset (taskflow-api)
│
├── tests/                                    # Automated Vitest TypeScript test suite
│   ├── health-and-validation.test.ts
│   ├── repositories.test.ts
│   ├── analysis.test.ts
│   └── contributions.test.ts
│
├── .env.example                              # Environment variables template
├── .eslintrc.json                            # ESLint configuration
├── .gitignore                                # Git ignore rules
├── next.config.ts                            # Next.js configuration
├── package.json                              # Unified project dependencies & scripts
├── postcss.config.mjs                        # PostCSS configuration
├── tailwind.config.ts                        # Stitch-generated Tailwind design tokens
├── tsconfig.json                             # TypeScript configuration
├── vitest.config.ts                          # Vitest test runner configuration
└── README.md                                 # Project documentation
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` in the project root (`E:\Patchpilot\.env.local`):

```env
# Server-side AI configuration (required for live AI explanations and Q&A)
GEMMA_API_KEY=your_google_ai_studio_api_key_here
GEMMA_MODEL=gemma-4-26b-a4b-it

# Optional GitHub token for higher GitHub REST API rate limits (5,000 req/hr vs 60 req/hr)
GITHUB_TOKEN=

# Optional application environment label
NEXT_PUBLIC_APP_ENV=development
```

| Variable | Scope | Description | Default |
|---|---|---|---|
| `GEMMA_API_KEY` | Server-only | Google AI Studio / Generative Language API key for live Gemma explanations and Q&A | *(Empty — demo repo still works)* |
| `GEMMA_MODEL` | Server-only | Gemma model identifier | `gemma-4-26b-a4b-it` |
| `GITHUB_TOKEN` | Server-only | Optional GitHub Personal Access Token for higher API rate limits | *(Empty — uses public unauthenticated API)* |
| `NEXT_PUBLIC_APP_ENV` | Public | Application environment label | `development` |

---

## 💻 Local Development

### Prerequisites
- **Node.js 18+** (Node.js 20+ or 22+ recommended)
- **npm**

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure local environment variables
cp .env.example .env.local
# Add your GEMMA_API_KEY (and optional GITHUB_TOKEN) to .env.local

# 3. Start the full-stack Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Both the UI and `/api/*` server routes run together in a single process.

---

## 🧪 Running Tests & Quality Checks

```bash
# Run automated unit and API route handler tests
npm test

# Run TypeScript static type checking
npm run type-check

# Run ESLint
npm run lint

# Build for production
npm run build
```

---

## ☁️ Deploying to Vercel

PatchPilot is structured as a **single, unified Next.js project** at the repository root—no separate backend service or cross-origin setup is needed:

1. Push your repository to GitHub and import it into **[Vercel](https://vercel.com/new)**.
2. Leave the **Root Directory** set to `.` (the repository root) and Framework Preset set to **Next.js**.
3. In **Vercel Project Settings → Environment Variables**, add:
   - `GEMMA_API_KEY` *(Required for live AI code explanations and Q&A)*
   - `GEMMA_MODEL` = `gemma-4-26b-a4b-it`
   - `GITHUB_TOKEN` *(Optional, recommended for higher GitHub rate limits)*
4. Click **Deploy**. Vercel will automatically build and host both the frontend pages and `/api/*` serverless routes on the same domain.

---

## 🔐 Security

- **Server-Side Credentials**: API credentials (`GEMMA_API_KEY`, `GITHUB_TOKEN`) are read exclusively inside server-side route handlers and are never sent to the client bundle.
- **Client Boundary**: Private API keys must never be prefixed with `NEXT_PUBLIC_`.
- **Input & Path Validation**: Repository owners, names, and file paths are strictly validated against SSRF and directory traversal (`..`, `\`, null bytes).
- **No Code Execution**: Repository content is analyzed strictly as text data and is never executed by the application.
- **Evidence Verification**: AI-generated suggestions and explanations are grounded in repository files and should be verified against actual repository evidence.

---

## 🤖 AI-Assisted Development

PatchPilot was developed with assistance from **[Google Antigravity](https://antigravity.google/)**, an AI-assisted development environment. It helped with implementation, code generation, debugging, and integrating different parts of the application.

The project combines AI-assisted development with hands-on configuration, testing, and integration to build a practical developer tool.

---

## 🎯 Project Goal

The goal of PatchPilot is to lower the barrier to open-source contribution by helping students and beginner developers understand unfamiliar codebases, learn from real-world projects, and identify meaningful ways to contribute.

*Built for developers who want to understand more, learn faster, and contribute with confidence. 💜*


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
