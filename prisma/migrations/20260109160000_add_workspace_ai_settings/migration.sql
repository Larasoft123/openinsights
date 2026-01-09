-- Add AI settings columns to workspaces table
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "ai_provider" TEXT;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "openai_transcription_model" TEXT;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "embedding_provider" TEXT;
