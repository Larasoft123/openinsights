-- ============================================
-- Migration: Remove Workspace AI Settings
--
-- This migration removes legacy AI settings from the workspaces table.
-- These settings are now managed at the organization level only.
--
-- Run with: psql $DATABASE_URL -f scripts/migrations/remove-workspace-ai-settings.sql
-- ============================================

-- Remove AI settings columns from workspaces table (if they exist)
-- These were legacy columns that caused configuration conflicts

ALTER TABLE workspaces DROP COLUMN IF EXISTS ai_provider;
ALTER TABLE workspaces DROP COLUMN IF EXISTS openai_transcription_model;
ALTER TABLE workspaces DROP COLUMN IF EXISTS embedding_provider;

-- Remove unencrypted API key columns (security fix - org-level keys are encrypted)
ALTER TABLE workspaces DROP COLUMN IF EXISTS gemini_api_key;
ALTER TABLE workspaces DROP COLUMN IF EXISTS openai_api_key;
ALTER TABLE workspaces DROP COLUMN IF EXISTS ollama_base_url;

-- Verify the changes
SELECT 'Workspace AI settings removed successfully' as status;
