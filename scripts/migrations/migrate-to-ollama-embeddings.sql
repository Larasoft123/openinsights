-- ============================================
-- Migration: Migrate to Ollama-Only Embeddings
--
-- This migration:
-- 1. Updates organization embedding config to Ollama + 768 dimensions
-- 2. Removes workspace-level AI settings columns
-- 3. Alters embedding column to 768 dimensions (data loss - requires re-vectorization)
--
-- IMPORTANT: After running this migration, you must re-vectorize all transcripts!
--
-- Run with: psql $DATABASE_URL -f scripts/migrations/migrate-to-ollama-embeddings.sql
-- ============================================

-- Step 1: Update all organizations to use Ollama embeddings
UPDATE organizations SET
  embedding_provider = 'ollama',
  embedding_dimension = 768
WHERE 1=1;

SELECT 'Step 1: Updated all organizations to Ollama (768 dimensions)' as status;

-- Step 2: Remove workspace AI settings from all tenant schemas
-- This is done dynamically for each tenant schema

DO $$
DECLARE
  schema_rec RECORD;
BEGIN
  -- Find all tenant schemas
  FOR schema_rec IN
    SELECT schema_name FROM organizations WHERE schema_name IS NOT NULL
  LOOP
    -- Remove AI settings columns from workspaces table
    EXECUTE format('ALTER TABLE %I.workspaces DROP COLUMN IF EXISTS ai_provider', schema_rec.schema_name);
    EXECUTE format('ALTER TABLE %I.workspaces DROP COLUMN IF EXISTS openai_transcription_model', schema_rec.schema_name);
    EXECUTE format('ALTER TABLE %I.workspaces DROP COLUMN IF EXISTS embedding_provider', schema_rec.schema_name);
    EXECUTE format('ALTER TABLE %I.workspaces DROP COLUMN IF EXISTS gemini_api_key', schema_rec.schema_name);
    EXECUTE format('ALTER TABLE %I.workspaces DROP COLUMN IF EXISTS openai_api_key', schema_rec.schema_name);
    EXECUTE format('ALTER TABLE %I.workspaces DROP COLUMN IF EXISTS ollama_base_url', schema_rec.schema_name);

    RAISE NOTICE 'Removed workspace AI settings from schema: %', schema_rec.schema_name;
  END LOOP;
END;
$$;

SELECT 'Step 2: Removed workspace AI settings from all tenant schemas' as status;

-- Step 3: Alter embedding column dimension in all tenant schemas
-- WARNING: This drops all existing embeddings!

DO $$
DECLARE
  schema_rec RECORD;
BEGIN
  FOR schema_rec IN
    SELECT schema_name FROM organizations WHERE schema_name IS NOT NULL
  LOOP
    -- Drop the HNSW index
    EXECUTE format('DROP INDEX IF EXISTS %I.%s_segments_embedding_idx', schema_rec.schema_name, schema_rec.schema_name);

    -- Alter the embedding column to 768 dimensions
    EXECUTE format('ALTER TABLE %I.transcript_segments DROP COLUMN IF EXISTS embedding', schema_rec.schema_name);
    EXECUTE format('ALTER TABLE %I.transcript_segments ADD COLUMN embedding vector(768)', schema_rec.schema_name);

    -- Recreate the HNSW index
    EXECUTE format('CREATE INDEX %s_segments_embedding_idx ON %I.transcript_segments USING hnsw (embedding vector_cosine_ops)', schema_rec.schema_name, schema_rec.schema_name);

    RAISE NOTICE 'Migrated embedding column to 768 dimensions in schema: %', schema_rec.schema_name;
  END LOOP;
END;
$$;

SELECT 'Step 3: Migrated embedding columns to 768 dimensions' as status;

-- Step 4: Reset source status to require re-vectorization
DO $$
DECLARE
  schema_rec RECORD;
  updated_count INT;
BEGIN
  FOR schema_rec IN
    SELECT schema_name FROM organizations WHERE schema_name IS NOT NULL
  LOOP
    EXECUTE format('
      UPDATE %I.sources
      SET status = ''PENDING''
      WHERE status = ''COMPLETED''
    ', schema_rec.schema_name);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Reset % sources to PENDING in schema: %', updated_count, schema_rec.schema_name;
  END LOOP;
END;
$$;

SELECT 'Step 4: Reset sources to PENDING for re-vectorization' as status;

-- ============================================
-- NEXT STEPS (manual):
-- 1. Start the vectorization worker: pnpm run worker
-- 2. Re-queue all sources for vectorization using the admin UI or:
--    psql -c "UPDATE tenant_default.sources SET status = 'PENDING' WHERE status = 'COMPLETED'"
-- 3. Monitor the worker logs for progress
-- ============================================

SELECT 'Migration complete! Run vectorization worker to re-embed transcripts.' as final_status;
