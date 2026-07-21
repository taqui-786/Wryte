# Wryte — AI-Powered Writing Assistant

Monorepo containing the frontend (Next.js) and backend (FastAPI / Python) for Wryte, an AI-powered blog/content writing platform with a WYSIWYG AI-editor.

## Project Structure

```
Wryte/
├── apps/
│   ├── frontend/          # Next.js 16 app (deployed on Vercel)
│   │   ├── src/           # App router, components, API routes, DB schema
│   │   ├── public/        # Static assets
│   │   ├── package.json
│   │   └── next.config.ts
│   └── backend/           # FastAPI Python app (deployed on Render)
│       ├── app/           # FastAPI app, routes, services, LangGraph workflow
│       ├── alembic/       # DB migrations
│       ├── main.py
│       └── pyproject.toml
├── vercel.json            # Vercel config (rootDirectory: apps/frontend)
├── render.yaml            # Render blueprint config
├── package.json           # Root workspace scripts
└── README.md
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (`npm install -g pnpm`)
- **Python** >= 3.12
- **uv** (Python package manager — `pip install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`)

## Local Setup

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/taqui-786/Wryte.git
cd Wryte
```

#### Frontend

```bash
cd apps/frontend
pnpm install
cp .env.example .env   # (if available) or create .env from the template below
```

#### Backend

```bash
cd apps/backend
uv sync
cp .env.example .env   # or create .env manually
```

### 2. Environment Variables

**apps/frontend/.env**

```env
DATABASE_URL="postgresql://..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
BETTER_AUTH_SECRET="..."
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
GROQ_API_KEY="..."
GEMINI_API_KEY="..."
GOOGLE_GENERATIVE_AI_API_KEY="..."
NEXT_PUBLIC_GROK_API_KEY="..."
NEXT_PUBLIC_BACKEND_URL="http://localhost:8000/api/v1"
```

**apps/backend/.env**

```env
DATABASE_URL="postgresql+asyncpg://..."
NVIDIA_API_KEY="..."
TINYFISH_API_KEY="..."
```

### 3. Database Migrations

#### Frontend (Drizzle)

```bash
cd apps/frontend
pnpm db:generate    # Generate migration files
pnpm db:migrate     # Apply migrations
```

#### Backend (Alembic)

```bash
cd apps/backend
alembic upgrade head
```

### 4. Run Locally

**Terminal 1 — Frontend**

```bash
cd apps/frontend
pnpm dev
# Opens at http://localhost:3000
```

**Terminal 2 — Backend**

```bash
cd apps/backend
uv run uvicorn app.app:app --reload --port 8000
# API at http://localhost:8000/api/v1
```

### 5. Verify

- Frontend: http://localhost:3000
- Backend health check: http://localhost:8000/api/v1/

## Deployment

### Vercel (Frontend)

The `vercel.json` at root sets `rootDirectory: "apps/frontend"`. In the Vercel dashboard:

1. Connect your GitHub repo
2. **Root Directory** will be auto-detected from `vercel.json` as `apps/frontend`
3. Add environment variables from `apps/frontend/.env`
4. Deploy

### Render (Backend)

The `render.yaml` defines the backend service. In the Render dashboard:

1. Connect your GitHub repo
2. Render will auto-detect the `render.yaml` blueprint
3. Add the required env vars (`DATABASE_URL`, `NVIDIA_API_KEY`, `TINYFISH_API_KEY`)
4. Deploy

## Useful Commands

| Command | Description |
|---|---|
| `pnpm dev:frontend` | Start frontend dev server |
| `pnpm build:frontend` | Build frontend for production |
| `pnpm dev:backend` | Start backend dev server |
| `pnpm lint` | Lint frontend code (Biome) |

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, ProseMirror, Better Auth, Drizzle ORM, Neon PostgreSQL
- **Backend:** FastAPI, Python 3.12, LangChain, LangGraph, SQLAlchemy, Alembic
- **AI:** Groq, Google GenAI, NVIDIA NIM
- **Package Managers:** pnpm (frontend), uv (backend)
