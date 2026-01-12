<p align="center">
  <img src="public/nin-logo-symbol.png" alt="OpenInsights" width="100" />
</p>

<h1 align="center">OpenInsights</h1>

<p align="center">
  <strong>Self-hosted, AI-powered research intelligence platform.</strong><br>
  Transcribe interviews. Find patterns. Own your data.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#why-openinsights">Why OpenInsights</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
</p>

<p align="center">
  <img src="docs/assets/demo.png" alt="OpenInsights Demo" width="800" />
</p>

---

## Why OpenInsights?

Most UX research tools force a choice: **convenience or privacy**. We built something better.

| Problem                                                 | OpenInsights Solution                                         |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| :lock: Sensitive interviews on someone else's servers   | Run 100% locally with Ollama — data never leaves your machine |
| :money_with_wings: Per-seat pricing kills team adoption | Free forever, self-host without limits                        |
| :electric_plug: Vendor lock-in with proprietary formats | Open source, standard PostgreSQL, export everything           |
| :snail: Manual transcription takes hours                | AI transcribes and suggests highlights in minutes             |
| :mag: Search only finds exact keywords                  | Semantic search finds meaning, not just words                 |

### How We Compare

| Feature                  |  OpenInsights  | Dovetail | Condens |  Grain  |
| ------------------------ | :------------: | :------: | :-----: | :-----: |
| Self-hosted              |    **Yes**     |    No    |   No    |   No    |
| Open source              |    **MIT**     |    No    |   No    |   No    |
| Local AI (Ollama)        |    **Yes**     |    No    |   No    |   No    |
| Free tier                | **Unlimited**  | Limited  | Limited | Limited |
| Semantic search          |    **Yes**     |   Yes    |   Yes   |   No    |
| Video analysis           |    **Yes**     |   Yes    |   Yes   |   Yes   |
| Ultra-fast transcription | **Yes** (Groq) |    No    |   No    |   No    |

---

## Features

<table>
<tr>
<td width="50%">

### :clapper: Analysis Canvas

Synchronized video playback with interactive transcript. Click any word to jump to that moment with **±100ms accuracy**. Keyboard shortcuts for power users.

</td>
<td width="50%">

<img src="docs/assets/canvas.png" alt="Analysis Canvas" />

</td>
</tr>
<tr>
<td width="50%">

### :sparkles: AI-Powered Transcription

Upload video or audio files up to **2GB**. Get accurate transcripts with speaker detection in minutes.

**Supported providers:**

- **Groq** (recommended) — Ultra-fast Whisper Large V3
- **OpenAI Whisper** — Industry-standard accuracy

</td>
<td width="50%">

<img src="docs/assets/transcription.png" alt="Transcription" />

</td>
</tr>
<tr>
<td width="50%">

### :dart: Evidence Dashboard

Semantic search across all your projects. Find that quote you vaguely remember in seconds.

**Embedding providers:**

- OpenAI (cloud, 1536 dimensions)
- Ollama (local, 768 dimensions) — **fully offline**

</td>
<td width="50%">

<img src="docs/assets/evidence.png" alt="Evidence Dashboard" />

</td>
</tr>
<tr>
<td width="50%">

### :jigsaw: Insight Board

Kanban-style drag-and-drop organization. **Magic Cluster** uses AI to automatically suggest theme groupings from your highlights.

</td>
<td width="50%">

<img src="docs/assets/insights.png" alt="Insight Board" />

</td>
</tr>
</table>

### More Features

| Feature                                 | Description                                                               |
| --------------------------------------- | ------------------------------------------------------------------------- |
| :label: **Tagging System**              | Create tags inline while highlighting. Custom colors, instant UI updates. |
| :outbox_tray: **Export**                | Generate Markdown or PDF reports. Preserves timestamps and themes.        |
| :busts_in_silhouette: **Multi-tenancy** | Workspace-based data isolation for teams.                                 |

### Privacy Options

| Setup               | Transcription    | Embeddings     | Data Location       |
| ------------------- | ---------------- | -------------- | ------------------- |
| :cloud: **Cloud**   | Groq / OpenAI    | OpenAI         | Your infrastructure |
| :repeat: **Hybrid** | Groq / OpenAI    | Ollama (local) | Your infrastructure |
| :house: **Local**   | Whisper (coming) | Ollama         | Fully on-premise    |

---

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

# Run the self-hosted setup script
./scripts/setup-self-hosted.sh

# Add your AI API keys to .env
# GOOGLE_GENERATIVE_AI_API_KEY="your-key" (recommended)
# or OPENAI_API_KEY="your-key"

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and create your account.

**The first user to register becomes the organization owner.**

> **See [docs/self-hosting.md](docs/self-hosting.md) for full deployment guide including Docker production setup and customization options.**

### Start Processing Media

```bash
# In a separate terminal, start background workers
pnpm worker
```

Workers handle:

- Audio extraction (FFmpeg)
- Transcription (Groq/Whisper)
- Vectorization (OpenAI/Ollama)

<details>
<summary><strong>:gear: Configure AI Providers</strong></summary>

After logging in, go to **Settings** to configure:

| Setting                | Options         | Description                           |
| ---------------------- | --------------- | ------------------------------------- |
| Transcription Provider | Groq, OpenAI    | Groq offers ultra-fast transcription  |
| Embedding Provider     | OpenAI, Ollama  | Ollama enables fully local embeddings |
| API Keys               | Groq, OpenAI    | Required for cloud providers          |
| Ollama URL             | localhost:11434 | For local embedding server            |

</details>

<details>
<summary><strong>:whale: Docker Production Deployment</strong></summary>

```bash
# Start all services (web app + worker + infrastructure)
docker compose --profile production up -d

# Or just infrastructure for local development
docker compose up -d
```

### Environment Variables

```bash
# AI Provider Selection
AI_PROVIDER="gemini"              # gemini | openai
EMBEDDING_PROVIDER="openai"       # openai | gemini | ollama

# API Keys (at least one required)
GOOGLE_GENERATIVE_AI_API_KEY=""   # For Gemini (recommended)
OPENAI_API_KEY=""                 # For OpenAI

# Local AI (optional - for fully offline)
OLLAMA_BASE_URL="http://localhost:11434"
```

See [docs/self-hosting.md](docs/self-hosting.md) for complete production deployment guide.

</details>

<details>
<summary><strong>:llama: Local with Ollama (fully offline embeddings)</strong></summary>

```bash
# 1. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull nomic-embed-text

# 2. Set environment
EMBEDDING_PROVIDER="ollama"
OLLAMA_BASE_URL="http://localhost:11434"

# 3. Run OpenInsights
docker compose up -d
pnpm dev
```

</details>

---

## Architecture

```
                          Next.js 15 Frontend
    +-----------+    +-----------+    +-----------+    +---------------+
    |  Projects |    |   Canvas  |    |  Evidence |    | Insight Board |
    +-----------+    +-----------+    +-----------+    +---------------+
                              |
                    Next.js API Routes (22 endpoints)
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
  +---------------+   +---------------+   +---------------+
  |  PostgreSQL   |   |     Redis     |   |     MinIO     |
  |  + pgvector   |   |   (BullMQ)    |   |   (Storage)   |
  +---------------+   +---------------+   +---------------+
                              |
                              v
                        BullMQ Workers
    +---------------+  +---------------+  +--------------------+
    |    Audio      |  | Transcription |  |   Vectorization    |
    |  Extraction   |  |    (Groq/     |  |    (OpenAI/        |
    |   (FFmpeg)    |  |   Whisper)    |  |      Ollama)       |
    +---------------+  +---------------+  +--------------------+
```

### Processing Pipeline

```
Upload → S3/MinIO → Audio Extraction → Transcription → Vectorization → Ready
             ↓           (FFmpeg)        (Groq/OpenAI)   (OpenAI/Ollama)
        Presigned URL                         ↓                ↓
        (resumable)                   Whisper Large V3   Embeddings stored
                                                         in pgvector
```

### Tech Stack

| Layer          | Technology                           |
| -------------- | ------------------------------------ |
| **Framework**  | Next.js 15 (App Router), React 19    |
| **Styling**    | Tailwind CSS v4, Shadcn/UI, Radix UI |
| **State**      | Zustand                              |
| **Database**   | PostgreSQL 16 + pgvector             |
| **ORM**        | Prisma 7                             |
| **Queue**      | BullMQ + Redis                       |
| **Storage**    | MinIO (local) / AWS S3 (production)  |
| **AI**         | Groq, OpenAI, Ollama                 |
| **Validation** | Zod                                  |
| **Logging**    | Pino                                 |
| **Testing**    | Vitest + React Testing Library       |

### Data Model

```
Workspace (multi-tenant container)
  └── Project (research study)
       ├── Source (video/audio file)
       │    └── TranscriptSegment (timestamped text + embedding)
       │         └── Highlight (tagged selection)
       ├── Tag (taxonomy with colors)
       │    └── Highlight
       └── Theme (insight grouping)
            └── HighlightTheme (many-to-many)
```

---

## Development

```bash
# Run tests (uses real database, no mocking)
pnpm test

# Watch mode
pnpm test:watch

# Code quality
pnpm lint          # ESLint
pnpm format        # Prettier
pnpm typecheck     # TypeScript
pnpm spellcheck    # CSpell

# Database
pnpm exec prisma migrate dev    # Run migrations
pnpm exec prisma studio         # Visual database browser
```

### Git Workflow

We use GitFlow with conventional commits:

- `main` — Production releases
- `develop` — Active development
- `feature/*` — New features
- `fix/*` — Bug fixes

Commit format: `type(scope): message`

---

## Roadmap

- [x] Analysis Canvas with synced transcript
- [x] Multi-provider AI transcription (Groq, OpenAI)
- [x] Semantic search with pgvector
- [x] Evidence Dashboard with filtering
- [x] Insight Board with Magic Cluster
- [x] Workspace-level AI configuration
- [x] Export to Markdown and PDF
- [ ] Local Whisper transcription (fully offline)
- [ ] Collaborative workspaces with team sharing
- [ ] Interview guide templates
- [ ] Plugin system for custom integrations

---

## Contributing

We welcome contributions! OpenInsights is built by researchers, for researchers.

**Quick links:**

- :bug: [Report a bug](https://github.com/ertad-family/openinsights/issues/new?labels=bug)
- :bulb: [Request a feature](https://github.com/ertad-family/openinsights/issues/new?labels=enhancement)
- :dart: [Good first issues](https://github.com/ertad-family/openinsights/labels/good%20first%20issue)
- :book: [Contributing guide](CONTRIBUTING.md)

### Development Setup

```bash
git clone https://github.com/ertad-family/openinsights.git
cd openinsights
pnpm install
./scripts/setup-self-hosted.sh
# Add your AI API key to .env
pnpm dev
```

---

## License

[MIT](LICENSE) — use it however you want.

---

<p align="center">
  <strong>Built with :heart: for the research community</strong><br>
  <a href="https://github.com/ertad-family/openinsights/stargazers">:star: Star us on GitHub</a> — it helps more than you know!
</p>
