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
  <img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="License">
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

| Feature              |    OpenInsights    | Dovetail | Condens |  Grain  |
| -------------------- | :----------------: | :------: | :-----: | :-----: |
| Self-hosted          |      **Yes**       |    No    |   No    |   No    |
| Open source          |    **AGPL-3.0**    |    No    |   No    |   No    |
| Local AI (Ollama)    |      **Yes**       |    No    |   No    |   No    |
| Free tier            |   **Unlimited**    | Limited  | Limited | Limited |
| Semantic search      |      **Yes**       |   Yes    |   Yes   |   No    |
| Video analysis       |      **Yes**       |   Yes    |   Yes   |   Yes   |
| Speaker diarization  | **Yes** (Deepgram) |   Yes    |   Yes   |   Yes   |
| Self-hosted STT      | **Yes** (WhisperX) |    No    |   No    |   No    |
| Project presets      |      **Yes**       |    No    |   No    |   No    |
| Custom metadata      |      **Yes**       |   Yes    |   Yes   |   No    |
| Multi-language (50+) |      **Yes**       |   Yes    |   Yes   |   Yes   |

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

- **Deepgram** (recommended) — Native diarization, excellent accuracy
- **AssemblyAI** — High-accuracy speaker diarization
- **OpenAI Whisper** — Industry-standard transcription
- **WhisperX** (self-hosted) — Fully local, GPU required

</td>
<td width="50%">

<img src="docs/assets/transcription.png" alt="Transcription" />

</td>
</tr>
<tr>
<td width="50%">

### :dart: Evidence Dashboard

Semantic search across all your projects. Find that quote you vaguely remember in seconds.

**Embeddings:** Ollama with `nomic-embed-text` (768 dimensions) — fully local, no cloud dependency

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

| Feature                                    | Description                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| :label: **Tagging System**                 | Create tags inline while highlighting. Custom colors, instant UI updates.                         |
| :package: **Project Presets**              | Save and apply project configurations. Reuse tags, metadata fields, and settings across projects. |
| :card_file_box: **Custom Metadata Fields** | Define custom fields for sources and projects. Text, number, date, select types supported.        |
| :globe_with_meridians: **Multi-language**  | Configure transcription language per source. 50+ languages supported.                             |
| :robot: **Custom AI Prompts**              | Customize AI behavior per project with role context and custom instructions.                      |
| :outbox_tray: **Export**                   | Generate Markdown or PDF reports. Preserves timestamps and themes.                                |
| :busts_in_silhouette: **Multi-tenancy**    | Workspace-based data isolation for teams.                                                         |

### Privacy Options

| Setup               | Transcription          | Embeddings        | Data Location       |
| ------------------- | ---------------------- | ----------------- | ------------------- |
| :cloud: **Cloud**   | Deepgram / AssemblyAI  | Ollama (768 dims) | Your infrastructure |
| :repeat: **Hybrid** | Deepgram / OpenAI      | Ollama (768 dims) | Your infrastructure |
| :house: **Local**   | WhisperX (self-hosted) | Ollama (768 dims) | Fully on-premise    |

> **Note:** Embeddings always use Ollama with `nomic-embed-text` model (768 dimensions). This is configured automatically during setup.

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

# Build and start production server
pnpm build
pnpm start
```

In a separate terminal, start the background worker:

```bash
pnpm worker
```

Open [http://localhost:3000](http://localhost:3000) and create your account.

**The first user to register becomes the organization owner.**

After logging in, go to **Settings > AI Settings** to configure your AI providers. No API keys in `.env` required — everything is configured via the UI.

> **See [docs/self-hosting.md](docs/self-hosting.md) for full deployment guide including Docker production setup and customization options.**

Workers handle:

- Audio extraction (FFmpeg)
- Transcription (Deepgram/AssemblyAI/OpenAI/WhisperX)
- Vectorization (Ollama - 768 dimensions)
- Summaries & Clustering (Gemini/OpenAI)

<details>
<summary><strong>:gear: Configure AI Providers</strong></summary>

After logging in, go to **Settings > AI Settings** to configure:

| Section           | Options                                | Description                             |
| ----------------- | -------------------------------------- | --------------------------------------- |
| **Transcription** | Deepgram, AssemblyAI, OpenAI, WhisperX | Speech-to-text with speaker diarization |
| **General AI**    | Gemini, OpenAI                         | Summaries, clustering, theme naming     |

Embeddings use Ollama (768 dimensions) and are configured automatically during setup.

All API keys are encrypted and stored securely in the database.

</details>

<details>
<summary><strong>:whale: Docker Production Deployment</strong></summary>

```bash
# Start all services (web app + worker + infrastructure)
docker compose --profile production up -d

# Or just infrastructure for local development
docker compose up -d

# Optional: Self-hosted AI services
docker compose --profile whisperx up -d   # WhisperX (GPU required)
docker compose --profile ollama up -d     # Ollama (local embeddings)
```

AI configuration is done via the Settings page after deployment. Required environment variables:

```bash
# Required for security
ENCRYPTION_KEY=""    # openssl rand -hex 32
AUTH_SECRET=""       # openssl rand -base64 32
```

See [docs/self-hosting.md](docs/self-hosting.md) for complete production deployment guide.

</details>

<details>
<summary><strong>:llama: Local Ollama Setup (required for embeddings)</strong></summary>

Ollama is the default (and only) embedding provider. The setup script configures it automatically:

```bash
# Option 1: Start Ollama via Docker Compose
docker compose --profile ollama up -d

# Option 2: Install Ollama manually
curl -fsSL https://ollama.com/install.sh | sh
ollama pull nomic-embed-text
```

The setup script detects Ollama and configures `OLLAMA_BASE_URL` automatically.

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
    |  Extraction   |  |   (Deepgram/  |  |    (Ollama -       |
    |   (FFmpeg)    |  |   AssemblyAI) |  |  768 dimensions)   |
    +---------------+  +---------------+  +--------------------+
```

### Processing Pipeline

```
Upload → S3/MinIO → Audio Extraction → Transcription → Vectorization → Ready
             ↓           (FFmpeg)       (Deepgram/      (Ollama -
        Presigned URL                  AssemblyAI/      768 dimensions)
        (resumable)                    OpenAI/WhisperX)       ↓
                                            ↓          Embeddings stored
                                    Speaker diarization   in pgvector
```

### Tech Stack

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| **Framework**  | Next.js 15 (App Router), React 19            |
| **Styling**    | Tailwind CSS v4, Shadcn/UI, Radix UI         |
| **State**      | Zustand                                      |
| **Database**   | PostgreSQL 16 + pgvector                     |
| **ORM**        | Prisma 7                                     |
| **Queue**      | BullMQ + Redis                               |
| **Storage**    | MinIO (local) / AWS S3 (production)          |
| **AI**         | Deepgram, AssemblyAI, OpenAI, Gemini, Ollama |
| **Validation** | Zod                                          |
| **Logging**    | Pino                                         |
| **Testing**    | Vitest + React Testing Library               |

### Data Model

```
Organization
  ├── Preset (reusable project configurations)
  └── Workspace (multi-tenant container)
       ├── MetadataField (custom fields for projects)
       └── Project (research study)
            ├── Source (video/audio file)
            │    ├── TranscriptSegment (timestamped text + embedding)
            │    │    └── Highlight (tagged selection)
            │    └── MetadataValue (custom field values)
            ├── Tag (taxonomy with colors)
            ├── MetadataField (project-level custom fields)
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

See our [Project Roadmap](https://github.com/users/ertad-family/projects/2/views/1) for planned features and progress.

---

## Contributing

We welcome contributions! OpenInsights is built by researchers, for researchers.

**Quick links:**

- :speech_balloon: [Discussions](https://github.com/ertad-family/openinsights/discussions) — Ask questions, share ideas, connect with the community
- :world_map: [Project Roadmap](https://github.com/users/ertad-family/projects/2/views/1) — See what's planned and in progress
- :bug: [Report a bug](https://github.com/ertad-family/openinsights/issues/new?labels=bug)
- :bulb: [Request a feature](https://github.com/ertad-family/openinsights/issues/new?labels=enhancement)
- :dart: [Good first issues](https://github.com/ertad-family/openinsights/labels/good%20first%20issue)
- :book: [Contributing guide](CONTRIBUTING.md)

---

## License

[AGPL-3.0](LICENSE) — free to use, modify, and self-host. If you offer this software as a network service, you must open-source your modifications.

---

<p align="center">
  <strong>Built with :heart: for the research community</strong><br>
  <a href="https://github.com/ertad-family/openinsights/stargazers">:star: Star us on GitHub</a> — it helps more than you know!
</p>
