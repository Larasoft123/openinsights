#!/bin/bash

# OpenInsights - Database Setup Script
# This script sets up the development database

set -e

echo "Starting OpenInsights database setup..."

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

# Run Prisma migrations
echo "Running Prisma migrations..."
pnpm exec prisma migrate dev

# Add pgvector embedding column (not supported by Prisma schema)
echo "Adding vector embedding column to transcript_segments..."
docker compose exec -T postgres psql -U openinsights -d openinsights -c "
  DO \$\$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transcript_segments' AND column_name = 'embedding'
    ) THEN
      ALTER TABLE transcript_segments ADD COLUMN embedding vector(1536);
      CREATE INDEX IF NOT EXISTS transcript_segments_embedding_idx
        ON transcript_segments USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    END IF;
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
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - MinIO API: localhost:9000"
echo "  - MinIO Console: localhost:9001"
echo ""
echo "Connection strings:"
echo "  DATABASE_URL=postgresql://openinsights:openinsights_dev@localhost:5432/openinsights"
echo "  REDIS_URL=redis://localhost:6379"
echo "  S3_ENDPOINT=http://localhost:9000"
