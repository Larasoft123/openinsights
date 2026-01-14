#!/bin/bash

# OpenInsights - Self-Hosted Setup Script
# This script sets up a complete self-hosted OpenInsights instance

set -e

echo "============================================"
echo "  OpenInsights Self-Hosted Setup"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
  exit 1
fi

# Check if docker compose is available
if ! docker compose version > /dev/null 2>&1; then
  echo -e "${RED}Error: docker compose is not available. Please install Docker Compose v2.${NC}"
  exit 1
fi

# ============================================
# Step 1: Environment Setup
# ============================================
echo -e "${YELLOW}Step 1: Setting up environment...${NC}"

if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env

  # Generate AUTH_SECRET
  AUTH_SECRET=$(openssl rand -base64 32)
  sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=\"$AUTH_SECRET\"|" .env

  # Generate ENCRYPTION_KEY
  ENCRYPTION_KEY=$(openssl rand -hex 32)
  sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=\"$ENCRYPTION_KEY\"|" .env

  echo -e "${GREEN}Generated .env with secure secrets${NC}"
  echo ""
  echo -e "${YELLOW}IMPORTANT: Edit .env to add your AI provider API keys:${NC}"
  echo "  - GOOGLE_GENERATIVE_AI_API_KEY (for Gemini)"
  echo "  - OPENAI_API_KEY (for OpenAI)"
  echo ""
else
  echo ".env file already exists, skipping..."
fi

# Load environment variables
export $(grep -v '^#' .env | grep -v '^\s*$' | xargs)

# Embedding: Ollama only (768 dimensions, local/private)
EMBEDDING_DIMS=768

echo "Embedding provider: Ollama ($EMBEDDING_DIMS dimensions)"
echo ""

# ============================================
# Step 2: Start Docker Services
# ============================================
echo -e "${YELLOW}Step 2: Starting Docker services...${NC}"

docker compose up -d postgres redis minio

echo "Waiting for services to be ready..."

# Wait for PostgreSQL
echo -n "  PostgreSQL: "
until docker compose exec -T postgres pg_isready -U openinsights -d openinsights > /dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo -e " ${GREEN}Ready${NC}"

# Wait for Redis
echo -n "  Redis: "
until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo -e " ${GREEN}Ready${NC}"

# Wait for MinIO
echo -n "  MinIO: "
until curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo -e " ${GREEN}Ready${NC}"

echo ""

# ============================================
# Step 3: Database Setup
# ============================================
echo -e "${YELLOW}Step 3: Setting up database...${NC}"

# Run Prisma migrations
echo "Running Prisma migrations..."
pnpm exec prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
pnpm exec prisma generate

echo ""

# ============================================
# Step 4: Create Tenant Schema
# ============================================
echo -e "${YELLOW}Step 4: Creating tenant schema...${NC}"

# Create tenant_default schema using TypeScript script
npx tsx scripts/init-tenant-schema.ts $EMBEDDING_DIMS

echo ""

# ============================================
# Step 5: Create MinIO Bucket
# ============================================
echo -e "${YELLOW}Step 5: Setting up storage bucket...${NC}"

# Configure MinIO client and create bucket
docker compose exec -T minio mc alias set local http://localhost:9000 openinsights openinsights_dev > /dev/null 2>&1 || true

# Create bucket if it doesn't exist
if docker compose exec -T minio mc ls local/openinsights > /dev/null 2>&1; then
  echo "Bucket 'openinsights' already exists, skipping..."
else
  docker compose exec -T minio mc mb local/openinsights
  echo "Created bucket 'openinsights'"
fi

echo ""

# ============================================
# Setup Complete
# ============================================
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Services running:"
echo "  - PostgreSQL: localhost:5433"
echo "  - Redis:      localhost:6379"
echo "  - MinIO API:  localhost:9000"
echo "  - MinIO UI:   localhost:9001"
echo ""
echo "Next steps:"
echo ""
echo "  1. Add your AI API keys to .env:"
echo "     - GOOGLE_GENERATIVE_AI_API_KEY (recommended)"
echo "     - OPENAI_API_KEY (alternative)"
echo ""
echo "  2. Build and start the server:"
echo "     pnpm build"
echo "     pnpm start"
echo ""
echo "  3. Start the worker (in another terminal):"
echo "     pnpm worker"
echo ""
echo "  4. Open http://localhost:3000 and register your account"
echo "     (First user becomes the organization owner)"
echo ""
echo "Or use Docker for everything:"
echo "  docker compose --profile production up -d"
echo ""
