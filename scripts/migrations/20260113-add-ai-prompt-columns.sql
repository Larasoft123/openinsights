-- Migration: Add AI Prompt Configuration columns to projects table
-- Issue: #42 - Custom AI Prompt Sets for projects
-- Date: 2026-01-13

-- This migration adds columns for custom AI prompts per project.
-- null = use system defaults (hardcoded prompts in worker code)
-- When templates (#43) are implemented, template prompts will be copied here on project creation

-- AI Prompt Configuration
ALTER TABLE tenant_default.projects ADD COLUMN IF NOT EXISTS source_summary_prompt TEXT;
ALTER TABLE tenant_default.projects ADD COLUMN IF NOT EXISTS project_summary_prompt TEXT;
ALTER TABLE tenant_default.projects ADD COLUMN IF NOT EXISTS theme_naming_prompt TEXT;
ALTER TABLE tenant_default.projects ADD COLUMN IF NOT EXISTS auto_tagging_prompt TEXT;
ALTER TABLE tenant_default.projects ADD COLUMN IF NOT EXISTS auto_tagging_enabled BOOLEAN DEFAULT FALSE;

-- Transcription Configuration (future use)
ALTER TABLE tenant_default.projects ADD COLUMN IF NOT EXISTS transcription_vocabulary TEXT;
ALTER TABLE tenant_default.projects ADD COLUMN IF NOT EXISTS transcription_context TEXT;
