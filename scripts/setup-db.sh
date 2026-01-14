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

# Embedding: Ollama only (768 dimensions, local/private)
EMBEDDING_DIMS=768

echo "Using DATABASE_URL with port: $DB_PORT"
echo "Embedding provider: Ollama ($EMBEDDING_DIMS dimensions)"

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

# Create tenant_default schema (business tables with pgvector)
echo "Creating tenant schema with $EMBEDDING_DIMS-dimension embeddings..."
npx tsx scripts/init-tenant-schema.ts $EMBEDDING_DIMS

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
