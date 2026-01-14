# Self-Hosting OpenInsights

This guide covers deploying OpenInsights on your own infrastructure for complete data control and privacy.

## Prerequisites

- **Docker** and **Docker Compose v2**
- **Node.js 20+** and **pnpm** (for development)
- **AI API Key** (at least one):
  - Google Gemini API key (recommended)
  - OpenAI API key (alternative)
  - Or Ollama for fully local AI

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/ertad-family/openinsights.git
cd openinsights
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Run Setup Script

```bash
./scripts/setup-self-hosted.sh
```

This script will:

- Generate `.env` with secure secrets
- Start PostgreSQL, Redis, and MinIO containers
- Run database migrations
- Create the tenant schema
- Set up the storage bucket

### 4. Add Your AI API Keys

Edit `.env` and add at least one AI provider key:

```bash
# For Gemini (recommended - native video support)
GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"

# For OpenAI (alternative)
OPENAI_API_KEY="your-key-here"
```

### 5. Build and Start

```bash
# Build the production app
pnpm build

# Terminal 1: Start the web app
pnpm start

# Terminal 2: Start the worker
pnpm worker
```

### 6. Open the App

Navigate to http://localhost:3000 and register your account.

**The first user to register becomes the organization owner.**

---

## Docker Deployment (Recommended)

### Using Docker Compose

Start all services including the web app and worker:

```bash
docker compose --profile production up -d
```

This starts:

- PostgreSQL with pgvector
- Redis
- MinIO (S3-compatible storage)
- OpenInsights web app
- Background worker

### Environment Variables

Create a `.env` file with production values:

```bash
# Required
DATABASE_URL="postgresql://user:pass@postgres:5432/openinsights"
REDIS_URL="redis://redis:6379"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"

# AI Provider (choose one for transcription/general AI)
AI_PROVIDER="gemini"
GOOGLE_GENERATIVE_AI_API_KEY="your-key"
# OR
AI_PROVIDER="openai"
OPENAI_API_KEY="your-key"

# Embeddings (Ollama only - configured automatically by setup script)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"

# Storage
S3_ENDPOINT="http://minio:9000"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
S3_BUCKET="openinsights"
S3_REGION="us-east-1"

# App URL (important for auth callbacks)
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Reverse Proxy (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Customization

### Branding

Customize your instance with environment variables:

```bash
# Site name (shown in navbar and titles)
NEXT_PUBLIC_SITE_NAME="Your Company Insights"

# Site description (shown on landing page)
NEXT_PUBLIC_SITE_DESCRIPTION="Internal research intelligence platform"

# Custom logo (URL or path in /public)
NEXT_PUBLIC_LOGO_URL="/your-logo.png"
```

### Embeddings (Ollama)

OpenInsights uses **Ollama** as the only embedding provider with **768 dimensions** (`nomic-embed-text` model). This provides:

- Fully local processing — no cloud dependency
- No API keys required for embeddings
- Consistent vector dimensions across all installations

The setup script automatically:

1. Detects if Ollama is installed
2. Pulls the `nomic-embed-text` model if needed
3. Configures `OLLAMA_BASE_URL` in your `.env`

**Manual Ollama setup:**

```bash
# Option 1: Via Docker Compose
docker compose --profile ollama up -d

# Option 2: Manual installation
curl -fsSL https://ollama.com/install.sh | sh
ollama pull nomic-embed-text
```

Configure in `.env`:

```bash
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"
```

---

## Database Management

### Backup

```bash
docker compose exec postgres pg_dump -U openinsights openinsights > backup.sql
```

### Restore

```bash
docker compose exec -T postgres psql -U openinsights openinsights < backup.sql
```

### View Tenant Schema

```bash
docker compose exec postgres psql -U openinsights -d openinsights -c "\dt tenant_default.*"
```

---

## Troubleshooting

### Services won't start

Check Docker logs:

```bash
docker compose logs postgres
docker compose logs redis
docker compose logs minio
```

### Migration fails

Ensure PostgreSQL is healthy:

```bash
docker compose exec postgres pg_isready -U openinsights
```

### Worker not processing jobs

Check worker logs:

```bash
docker compose logs worker
```

Ensure Redis is accessible:

```bash
docker compose exec redis redis-cli ping
```

### File uploads fail

Verify MinIO bucket exists:

```bash
docker compose exec minio mc ls local/openinsights
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │   Web   │  │ Worker  │  │ Postgres│  │  Redis  │    │
│  │ (Next)  │  │ (BullMQ)│  │(pgvector)│ │         │    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │            │            │            │          │
│       └────────────┴────────────┴────────────┘          │
│                         │                               │
│                    ┌────┴────┐                          │
│                    │  MinIO  │                          │
│                    │  (S3)   │                          │
│                    └─────────┘                          │
└─────────────────────────────────────────────────────────┘
```

### Database Schema

- **Public schema** (Prisma): Users, organizations, sessions
- **tenant_default schema** (Raw SQL): Workspaces, projects, sources, segments, highlights

---

## Development Mode

For contributors who want to modify the code:

```bash
# Run setup first (if not already done)
./scripts/setup-self-hosted.sh

# Start development server with hot reload
pnpm dev

# In another terminal, start worker in dev mode
pnpm worker:dev
```

Development mode provides:

- Hot module replacement (HMR)
- Faster rebuilds
- Source maps for debugging

---

## Support

- GitHub Issues: https://github.com/ertad-family/openinsights/issues
- Documentation: https://github.com/ertad-family/openinsights#readme
