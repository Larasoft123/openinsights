-- OpenInsights Database Initialization
-- This script runs automatically when PostgreSQL container starts for the first time

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable uuid-ossp for UUID generation (optional, Prisma uses cuid by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Confirm extensions are enabled
SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp');
