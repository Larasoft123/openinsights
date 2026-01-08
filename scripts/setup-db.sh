#!/bin/bash

# OpenInsights - Database Setup Script
# This script sets up the development database

set -e

echo "Starting OpenInsights database setup..."

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Default DATABASE_URL if not set
DATABASE_URL="${DATABASE_URL:-postgresql://openinsights:openinsights_dev@localhost:5432/openinsights}"

# Extract port from DATABASE_URL for display
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*localhost:\([0-9]*\).*/\1/p')
DB_PORT="${DB_PORT:-5432}"

# Embedding provider configuration (deployment-time decision)
# - openai: 1536 dimensions (cloud)
# - gemini: 768 dimensions (cloud)
# - ollama: 768 dimensions (local/private)
EMBEDDING_PROVIDER="${EMBEDDING_PROVIDER:-openai}"

case "$EMBEDDING_PROVIDER" in
  openai)
    EMBEDDING_DIMS=1536
    ;;
  gemini|ollama)
    EMBEDDING_DIMS=768
    ;;
  *)
    echo "Error: Unknown EMBEDDING_PROVIDER: $EMBEDDING_PROVIDER"
    echo "Valid options: openai, gemini, ollama"
    exit 1
    ;;
esac

echo "Using DATABASE_URL with port: $DB_PORT"
echo "Embedding provider: $EMBEDDING_PROVIDER ($EMBEDDING_DIMS dimensions)"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker first."
  exit 1
fi

# Start containers
echo "Starting Docker containers..."
docker compose up -d postgres redis minio

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U openinsights -d openinsights > /dev/null 2>&1; do
  echo "PostgreSQL is not ready yet. Waiting..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Run Prisma migrations (deploy mode - no drift check, no interactive prompts)
echo "Running Prisma migrations..."
DATABASE_URL="$DATABASE_URL" pnpm exec prisma migrate deploy

# Add pgvector embedding column (not supported by Prisma schema)
echo "Adding vector embedding column to transcript_segments ($EMBEDDING_DIMS dimensions)..."
docker compose exec -T postgres psql -U openinsights -d openinsights -c "
  DO \$\$
  BEGIN
    -- Check if column exists with different dimension
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transcript_segments' AND column_name = 'embedding'
    ) THEN
      -- Column exists - check if we need to alter dimension
      -- Note: Changing dimensions requires dropping and recreating the column
      RAISE NOTICE 'Embedding column already exists. Skipping creation.';
      RAISE NOTICE 'To change dimensions, drop the column manually and re-run setup.';
    ELSE
      -- Add embedding column with configured dimensions
      ALTER TABLE transcript_segments ADD COLUMN embedding vector($EMBEDDING_DIMS);
    END IF;

    -- Drop old ivfflat index if exists and create HNSW index
    DROP INDEX IF EXISTS transcript_segments_embedding_idx;
    DROP INDEX IF EXISTS transcript_segments_embedding_hnsw_idx;
    CREATE INDEX transcript_segments_embedding_hnsw_idx
      ON transcript_segments USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  END
  \$\$;
"

# Generate Prisma client
echo "Generating Prisma client..."
pnpm exec prisma generate

echo ""
echo "Database setup complete!"
echo ""
echo "Services running:"
echo "  - PostgreSQL: localhost:$DB_PORT"
echo "  - Redis: localhost:6379"
echo "  - MinIO API: localhost:9000"
echo "  - MinIO Console: localhost:9001"
echo ""
echo "Connection string:"
echo "  DATABASE_URL=$DATABASE_URL"
