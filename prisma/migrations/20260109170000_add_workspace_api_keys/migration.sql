-- Add API key fields to workspaces table
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "gemini_api_key" TEXT;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "openai_api_key" TEXT;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "ollama_base_url" TEXT;
