# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenInsights is a **privacy-first, open source research intelligence platform** for qualitative researchers. It transforms raw video/audio data into structured evidence with AI-powered transcription, semantic search, and rapid tagging capabilities.

**Core Problem Solved:** High cost, cloud-only data storage, and vendor lock-in of current market leaders (Dovetail, Condens).

## Tech Stack

| Layer          | Technology                                                              |
| -------------- | ----------------------------------------------------------------------- |
| **Frontend**   | Next.js 15 (App Router), React 19, Tailwind CSS v4, Shadcn/UI, Radix UI |
| **State**      | Zustand (client state management)                                       |
| **Backend**    | Next.js Route Handlers, Node.js Workers (BullMQ)                        |
| **Database**   | PostgreSQL 16 with pgvector extension                                   |
| **ORM**        | Prisma 7                                                                |
| **Queue**      | BullMQ + Redis                                                          |
| **Storage**    | MinIO (local) / AWS S3 (production)                                     |
| **AI**         | Gemini (primary) / OpenAI (fallback) for transcription + embeddings     |
| **Validation** | Zod                                                                     |
| **Logging**    | Pino                                                                    |
| **Testing**    | Vitest + React Testing Library                                          |

## Development Commands

```bash
# Start development server
pnpm dev

# Start workers
pnpm worker                        # Run worker process

# Run tests (run sequentially to avoid DB conflicts)
pnpm test              # Run once
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage
pnpm vitest run src/__tests__/path/to/test.ts  # Run single test file

# Code quality
pnpm lint              # ESLint
pnpm lint:fix          # ESLint with auto-fix
pnpm format            # Prettier format all
pnpm format:check      # Check formatting
pnpm typecheck         # TypeScript check
pnpm spellcheck        # Cspell spell-check

# Database
pnpm exec prisma migrate dev     # Run migrations
pnpm exec prisma generate        # Generate client
pnpm exec prisma studio          # Open Prisma Studio

# Docker (local infrastructure)
docker compose up -d                      # Start PostgreSQL, Redis, MinIO
docker compose --profile worker up -d     # Start with worker
docker compose down                       # Stop containers
./scripts/setup-db.sh                     # Full database setup
```

## Project Structure

Path alias: `@/*` maps to `./src/*`

```
src/
├── app/                    # Next.js App Router pages
│   └── api/                # Route handlers (REST endpoints)
├── components/
│   ├── ui/                 # Shadcn UI components
│   └── providers/          # React context providers
├── lib/
│   ├── ai/                 # AI provider abstraction
│   │   ├── provider.ts     # Provider factory
│   │   ├── types.ts        # Shared interfaces
│   │   └── providers/      # Gemini, OpenAI, Ollama implementations
│   ├── db/                 # Prisma client
│   ├── queues/             # BullMQ queue definitions
│   │   └── workers/        # Worker implementations
│   ├── services/           # Business logic services
│   ├── stores/             # Zustand state stores
│   ├── logger/             # Pino logger
│   ├── validations/        # Zod schemas
│   └── utils.ts            # Utility functions
├── workers/
│   └── index.ts            # Worker runner entry point
├── __tests__/              # Test files
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests (real DB)
│   └── setup.ts            # Test setup
└── generated/
    └── prisma/             # Generated Prisma client
```

## Backend Processing Pipeline

### Multi-Provider AI Architecture

| Feature                 | Gemini                 | OpenAI                     |
| ----------------------- | ---------------------- | -------------------------- |
| **Video Transcription** | Native (1 step)        | FFmpeg + Whisper (2 steps) |
| **Context Window**      | 1M+ tokens             | 128K tokens                |
| **Embeddings**          | text-embedding-004     | text-embedding-3-small     |

### Pipeline Flow

**Gemini Mode (Default):**

```
Upload → S3 → Transcription Worker → Vectorization Worker → Complete
                   (Gemini)              (OpenAI)
```

**OpenAI Mode (Fallback):**

```
Upload → S3 → Audio Extraction → Transcription → Vectorization → Complete
                  (FFmpeg)         (Whisper)       (OpenAI)
```

### Workers

| Worker               | Purpose                        | Provider                          |
| -------------------- | ------------------------------ | --------------------------------- |
| **Audio Extraction** | FFmpeg video→audio             | OpenAI mode only                  |
| **Transcription**    | Speech-to-text with timestamps | Gemini or OpenAI Whisper          |
| **Vectorization**    | Semantic embeddings for search | OpenAI, Gemini, or Ollama (local) |

### Environment Variables

```bash
# AI Provider Selection (transcription)
AI_PROVIDER="gemini"  # Options: "gemini" | "openai"

# Embedding Provider (one-time choice - changing requires re-vectorization)
EMBEDDING_PROVIDER="openai"  # Options: "openai" | "gemini" | "ollama"

# Gemini (recommended for video transcription)
GOOGLE_GENERATIVE_AI_API_KEY="AIza..."

# OpenAI (fallback transcription + embeddings)
OPENAI_API_KEY="sk-..."

# Ollama (local/private embeddings - for privacy-first deployments)
OLLAMA_BASE_URL="http://localhost:11434"
```

## Data Model

```
Workspace (multi-tenant container, stores AI settings/keys)
  └── Project (research container)
       ├── Source (video/audio file)
       │    └── TranscriptSegment (timestamped text + pgvector embedding)
       │         └── Highlight (tagged selection)
       ├── Tag (taxonomy)
       │    └── Highlight
       └── Theme (grouping for insights synthesis)
            └── HighlightTheme (many-to-many join)
```

## Coding Conventions

### TypeScript

- **NO `as any` type casting** - Use proper typing or `unknown` with type guards
- Prefer `interface` over `type` for object shapes
- Use Zod for runtime validation at API boundaries and worker job data

### Database

- Always check table structure before writing migrations
- Use Prisma's `@@map()` for snake_case table names
- Cascade deletes are defined in schema - be aware of data dependencies
- pgvector columns added via raw SQL (not supported in Prisma schema)

### Testing

- **NO mocking for integration/e2e tests** - Test real DB queries, APIs, HTTP connections
- Unit tests with Vitest for pure logic/utils
- React Testing Library for component testing

### Git Workflow (GitFlow)

- `main` - Production releases only
- `develop` - Active development (default branch)
- `feature/*` - New features
- `fix/*` - Bug fixes
- Commit format: `type(scope): message` (enforced by commitlint)

### API Design

- Validate all inputs with Zod schemas
- Use Pino logger for structured logging
- Handle errors gracefully with proper HTTP status codes

## Environment Setup

1. Copy `.env.example` to `.env`
2. Add AI API keys (Gemini and/or OpenAI)
3. Start Docker containers: `docker compose up -d`
4. Run database setup: `./scripts/setup-db.sh`
5. Start dev server: `pnpm dev`
6. (Optional) Start workers: `pnpm worker`

## Key Features (PRD Reference)

1. **Media Ingestion** - Async upload up to 2GB with resumable state
2. **Processing Pipeline** - BullMQ workers for audio extraction, STT, diarization, vectorization
3. **Analysis Canvas** - Synced transcription with video player (±100ms accuracy)
4. **Semantic Search** - pgvector for meaning-based clip discovery
5. **Multi-tenancy** - Workspace and Project based data isolation

## Important Notes

- This project prioritizes **self-hosting capability** - everything runs in docker-compose
- Privacy is paramount - support both cloud AI (OpenAI/Gemini) and local AI (Ollama)
- For full privacy: use `EMBEDDING_PROVIDER=ollama` (no cloud AI required for embeddings)
- Performance target: <100ms latency for transcript filtering and video sync
- Gemini recommended for transcription (native video support, larger context window)
- Embedding dimensions vary by provider: OpenAI=1536, Gemini=768, Ollama=768
- When creating issues, leaving comments on GitHub, committing, pushing and creating PRs do not include the Claude Code reference or Co-Authored-By footer
