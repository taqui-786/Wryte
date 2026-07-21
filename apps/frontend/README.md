<p align="center">
  <img src="public/logo.png" alt="Wryte Logo" width="120" />
</p>

<h1 align="center">Wryte</h1>

<p align="center">
  <strong>AI-Powered Writing Assistant — Write Boldly, Publish Faster</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#license">License</a>
</p>

---

## What is Wryte?

**Wryte** is a modern, AI-powered writing assistant that combines a distraction-free document editor with an intelligent AI agent sidebar. Draft, edit, and refine your documents effortlessly — the AI can rewrite paragraphs, generate content, adjust tone, and even manage your document title — all in real time.

Whether you're crafting blog posts, technical docs, or creative writing, Wryte helps you go from blank page to polished content faster than ever.

---

## Features

- ✍️ **Distraction-Free Editor** — A rich ProseMirror-based editor with markdown shortcuts, code highlighting, and a clean UI.
- 🤖 **AI Agent Sidebar** — Chat with an AI assistant that can directly edit your document, rewrite sections, generate new content, and update the title.
- 💬 **Multi-Chat Persistence** — Save and revisit multiple AI conversations per document, with auto-generated chat titles.
- 🧠 **Dual AI Providers** — Powered by **Groq** and **Google GenAI** via the Vercel AI SDK for fast, high-quality responses.
- 🔐 **Authentication** — Secure sign-in with **Better Auth** (supports OAuth and credential-based flows).
- 📄 **Document Management** — Create, rename, and delete documents. Your work is persisted in a **Neon** PostgreSQL database via Drizzle ORM.
- 🎨 **Beautiful UI** — Built with **shadcn/ui**, **Radix UI**, and **Framer Motion** for smooth animations and a premium feel.
- 📱 **Responsive Layout** — Resizable panel layout with a collapsible sidebar, optimised for all screen sizes.
- ⚡ **Real-Time Streaming** — AI responses stream token-by-token for an instant, interactive experience.
- 🔔 **Toast Notifications** — Rich, contextual feedback via **Sonner**.

---

## Tech Stack

### Core Framework

| Technology | Purpose |
|---|---|
| [Next.js 16](https://nextjs.org) | Full-stack React framework (App Router) |
| [React 19](https://react.dev) | UI library |
| [TypeScript](https://www.typescriptlang.org) | Type-safe development |

### AI & LLM

| Technology | Purpose |
|---|---|
| [Vercel AI SDK](https://sdk.vercel.ai) | Unified AI provider interface & streaming |
| [Groq](https://groq.com) | Ultra-fast LLM inference |
| [Google GenAI](https://ai.google.dev) | Gemini model access |

### Editor

| Technology | Purpose |
|---|---|
| [ProseMirror](https://prosemirror.net) | Rich-text document editor core |
| Custom Markdown pipeline | Markdown ↔ ProseMirror serialisation |

### Database & ORM

| Technology | Purpose |
|---|---|
| [Drizzle ORM](https://orm.drizzle.team) | Type-safe SQL queries & migrations |
| [Neon Serverless Postgres](https://neon.tech) | Serverless PostgreSQL database |

### Authentication

| Technology | Purpose |
|---|---|
| [Better Auth](https://www.better-auth.com) | Flexible, modern auth framework |

### UI & Styling

| Technology | Purpose |
|---|---|
| [Tailwind CSS 4](https://tailwindcss.com) | Utility-first CSS |
| [shadcn/ui](https://ui.shadcn.com) | Accessible, composable UI components |
| [Radix UI](https://www.radix-ui.com) | Headless UI primitives |
| [Framer Motion](https://www.framer.com/motion) | Declarative animations |
| [Lucide React](https://lucide.dev) | Beautiful icon set |
| [HugeIcons](https://hugeicons.com) | Extended icon library |

### Data Fetching & State

| Technology | Purpose |
|---|---|
| [TanStack React Query](https://tanstack.com/query) | Server-state caching & mutations |
| [nuqs](https://nuqs.47ng.com) | Type-safe URL search params |
| [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) | Form handling & validation |

### Developer Experience

| Technology | Purpose |
|---|---|
| [Biome](https://biomejs.dev) | Linting & formatting |
| [pnpm](https://pnpm.io) | Fast, disk-efficient package manager |

---

## Architecture

```
Browser
  └─ Next.js App Router
       ├─ Landing Page (public)
       ├─ Auth Pages (sign-in)
       └─ (user) — authenticated routes
            ├─ /write/:id — Document editor + AI sidebar
            ├─ /settings  — User settings
            └─ /feedback  — Feedback form
       └─ /api
            ├─ /api/auth     — Better Auth endpoints
            └─ /api/agent    — AI streaming endpoint (Vercel AI SDK)

Database: Neon Postgres (via Drizzle ORM)
AI:       Groq / Google GenAI (via Vercel AI SDK)
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (recommended)
- A **Neon** database (or any Postgres)
- API keys for **Groq** and/or **Google GenAI**

### Installation

```bash
# Clone the repository
git clone https://github.com/taqui-786/Wryte.git
cd wryte

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Fill in your database URL, auth secrets, and AI API keys
```

### Database Setup

```bash
# Generate Drizzle migrations
pnpm db:generate

# Run migrations
pnpm db:migrate
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Production Build

```bash
pnpm build
pnpm start
```

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout + SEO metadata
│   ├── page.tsx            # Landing page
│   ├── signin/             # Authentication pages
│   ├── (user)/             # Authenticated routes
│   │   ├── write/          # Document editor
│   │   ├── settings/       # User settings
│   │   └── feedback/       # Feedback
│   └── api/                # API routes (auth, agent)
├── components/
│   ├── landingPage/        # Landing page components
│   ├── my-editor/          # ProseMirror editor setup
│   ├── agent/              # AI agent sidebar
│   ├── ai-elements/        # AI-specific UI elements
│   ├── ui/                 # shadcn/ui components
│   ├── WriteClient.tsx     # Main editor orchestrator
│   ├── UserSidebar.tsx     # Document list sidebar
│   └── UserHeader.tsx      # App header
├── db/                     # Drizzle schema & migrations
├── lib/                    # Utilities & helpers
└── actions/                # Server actions
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon / Postgres connection string |
| `BETTER_AUTH_SECRET` | Secret for Better Auth |
| `GROQ_API_KEY` | Groq API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google GenAI API key |

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Format with Biome |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run database migrations |

---

## License

This project is private. All rights reserved.
