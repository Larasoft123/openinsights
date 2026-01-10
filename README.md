# OpenInsights

**Privacy-first, open source research intelligence platform for qualitative researchers.**

Transform raw video and audio data into structured evidence with AI-powered transcription, semantic search, and rapid tagging capabilities.

## Why OpenInsights?

Current market leaders (Dovetail, Condens) offer powerful features but come with significant trade-offs:

- **High cost** — Enterprise pricing excludes individual researchers and small teams
- **Cloud-only storage** — Your sensitive research data lives on someone else's servers
- **Vendor lock-in** — Proprietary formats make it hard to leave

OpenInsights solves these problems by being **fully self-hosted**, **open source**, and designed with **privacy first**.

## Features

### Core Capabilities

- **AI Transcription** — Native video support via Gemini, or audio-based via OpenAI Whisper
- **Semantic Search** — Find clips by meaning, not just keywords, using pgvector embeddings
- **Analysis Canvas** — Synced video player and transcript with ±100ms accuracy
- **Evidence Dashboard** — Search and filter highlights across all sources
- **Insight Board** — Kanban-style drag-and-drop for organizing themes
- **Magic Cluster** — AI-powered automatic theme suggestions from unassigned highlights
- **Tagging System** — Inline tag creation with instant UI updates
- **Export** — Markdown and PDF export for project insights

### Privacy Options

| Setup      | Transcription    | Embeddings      | Data Location       |
| ---------- | ---------------- | --------------- | ------------------- |
| **Cloud**  | Gemini / OpenAI  | OpenAI / Gemini | Your infrastructure |
| **Hybrid** | Gemini / OpenAI  | Ollama (local)  | Your infrastructure |
| **Local**  | Whisper (coming) | Ollama          | Fully on-premise    |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker and Docker Compose

### Setup

```bash
# Clone the repository
git clone https://github.com/ertad-family/openinsights.git
cd openinsights

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d

# Setup database
./scripts/setup-db.sh

# Start development server
pnpm dev

# (Optional) Start background workers for media processing
pnpm worker
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Tech Stack

| Layer    | Technology                                       |
| -------- | ------------------------------------------------ |
| Frontend | Next.js 15, React 19, Tailwind CSS v4, Shadcn/UI |
| State    | Zustand                                          |
| Backend  | Next.js Route Handlers, BullMQ Workers           |
| Database | PostgreSQL 16 + pgvector                         |
| ORM      | Prisma 7                                         |
| Queue    | BullMQ + Redis                                   |
| Storage  | MinIO (local) / AWS S3 (production)              |
| AI       | Gemini, OpenAI, Ollama                           |

## Configuration

All AI settings are configured through the **Settings UI** after logging in:

| Setting                    | Options                      | Description                           |
| -------------------------- | ---------------------------- | ------------------------------------- |
| **Transcription Provider** | Gemini (recommended), OpenAI | Gemini supports native video input    |
| **Embedding Provider**     | OpenAI, Gemini, Ollama       | Ollama enables fully local embeddings |
| **API Keys**               | Gemini, OpenAI               | Required for cloud providers          |
| **Ollama URL**             | localhost:11434              | For local embedding server            |

## Development

```bash
# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format

# Type check
pnpm typecheck

# Database migrations
pnpm exec prisma migrate dev
```

## Architecture

```
                        Next.js Frontend
  +-----------+  +-----------+  +-----------+  +---------------+
  |  Projects |  |   Canvas  |  |  Evidence |  | Insight Board |
  +-----------+  +-----------+  +-----------+  +---------------+
                              |
                    Next.js API Routes
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
+---------------+    +---------------+    +---------------+
|  PostgreSQL   |    |     Redis     |    |     MinIO     |
|  + pgvector   |    |    (Queue)    |    |   (Storage)   |
+---------------+    +---------------+    +---------------+
                              |
                              v
                       BullMQ Workers
  +---------------+  +---------------+  +--------------------+
  |    Audio      |  | Transcription |  |   Vectorization    |
  |  Extraction   |  |   (Gemini/    |  |  (OpenAI/Gemini/   |
  |   (FFmpeg)    |  |   Whisper)    |  |      Ollama)       |
  +---------------+  +---------------+  +--------------------+
```

## Docker Deployment

```bash
# Start all services including worker
docker compose --profile worker up -d
```

API keys are configured through the Settings UI after deployment.

## Roadmap

- [ ] Local Whisper transcription (fully offline)
- [ ] Collaborative workspaces with team sharing
- [ ] Interview guide templates
- [ ] Plugin system for custom integrations

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)

---

Built with care for the research community.
