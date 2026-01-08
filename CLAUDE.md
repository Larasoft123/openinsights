# OpenInsights - Claude Code Instructions

## Project Overview

OpenInsights is a **privacy-first, open source research intelligence platform** for qualitative researchers. It transforms raw video/audio data into structured evidence with AI-powered transcription, semantic search, and rapid tagging capabilities.

**Core Problem Solved:** High cost, cloud-only data storage, and vendor lock-in of current market leaders (Dovetail, Condens).

## Tech Stack

| Layer          | Technology                                                              |
| -------------- | ----------------------------------------------------------------------- |
| **Frontend**   | Next.js 15 (App Router), React 19, Tailwind CSS v4, Shadcn/UI, Radix UI |
| **Backend**    | Next.js Route Handlers, Node.js Workers (BullMQ)                        |
| **Database**   | PostgreSQL 16 with pgvector extension                                   |
| **ORM**        | Prisma                                                                  |
| **Queue**      | BullMQ + Redis                                                          |
| **Storage**    | MinIO (local) / AWS S3 (production)                                     |
| **Validation** | Zod                                                                     |
| **Logging**    | Pino                                                                    |
| **Testing**    | Vitest + React Testing Library                                          |

## Development Commands

```bash
# Start development server
pnpm dev

# Run tests
pnpm test              # Run once
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage

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
docker compose up -d             # Start PostgreSQL, Redis, MinIO
docker compose down              # Stop containers
./scripts/setup-db.sh            # Full database setup
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/
│   ├── ui/                 # Shadcn UI components
│   └── providers/          # React context providers
├── lib/
│   ├── db/                 # Prisma client
│   ├── queues/             # BullMQ queue definitions
│   ├── logger/             # Pino logger
│   ├── validations/        # Zod schemas
│   └── utils.ts            # Utility functions
├── generated/
│   └── prisma/             # Generated Prisma client
└── test/
    └── setup.ts            # Test setup file
```

## Coding Conventions

### TypeScript

- **NO `as any` type casting** - Use proper typing or `unknown` with type guards
- Prefer `interface` over `type` for object shapes
- Use Zod for runtime validation at API boundaries

### Database

- Always check table structure before writing migrations
- Use Prisma's `@@map()` for snake_case table names
- Cascade deletes are defined in schema - be aware of data dependencies

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
2. Start Docker containers: `docker compose up -d`
3. Run database setup: `./scripts/setup-db.sh`
4. Start dev server: `pnpm dev`

## Key Features (PRD Reference)

1. **Media Ingestion** - Async upload up to 2GB with resumable state
2. **Processing Pipeline** - BullMQ workers for audio extraction, STT, diarization, vectorization
3. **Analysis Canvas** - Synced transcription with video player (±100ms accuracy)
4. **Semantic Search** - pgvector for meaning-based clip discovery
5. **Multi-tenancy** - Workspace and Project based data isolation

## Important Notes

- This project prioritizes **self-hosting capability** - everything runs in docker-compose
- Privacy is paramount - support both cloud AI (OpenAI) and local AI (Ollama/Whisper)
- Performance target: <100ms latency for transcript filtering and video sync
