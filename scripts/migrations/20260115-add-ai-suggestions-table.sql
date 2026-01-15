-- Migration: Add AI highlight suggestions infrastructure
-- Issue: #97 - Implement AI Auto-Highlighting and Tagging for Transcripts
-- Date: 2026-01-15

-- This migration adds:
-- 1. ai_highlight_suggestions table for storing AI-generated suggestions pending user review
-- 2. auto_tagging_status column to sources for tracking auto-highlighting progress
-- 3. Updates auto_tagging_enabled default to TRUE (feature enabled by default)

-- NOTE: Run this for each tenant schema (tenant_default, tenant_*, etc.)
-- Example: psql -d openinsights -f scripts/migrations/20260115-add-ai-suggestions-table.sql

-- ============================================
-- 1. Create AI Highlight Suggestions Table
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_default.ai_highlight_suggestions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source_id TEXT NOT NULL REFERENCES tenant_default.sources(id) ON DELETE CASCADE,
  segment_id TEXT NOT NULL REFERENCES tenant_default.transcript_segments(id) ON DELETE CASCADE,
  tag_names TEXT[] NOT NULL,           -- Array of suggested tag names
  selected_text TEXT,                  -- Optional: specific quote from segment
  confidence DECIMAL(3,2),             -- AI confidence score (0.00 to 1.00)
  ai_note TEXT,                        -- AI reasoning/explanation
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS ai_suggestions_source_id_idx
  ON tenant_default.ai_highlight_suggestions(source_id);

CREATE INDEX IF NOT EXISTS ai_suggestions_segment_id_idx
  ON tenant_default.ai_highlight_suggestions(segment_id);

CREATE INDEX IF NOT EXISTS ai_suggestions_status_idx
  ON tenant_default.ai_highlight_suggestions(status);

-- ============================================
-- 2. Add auto_tagging_status to sources
-- ============================================

ALTER TABLE tenant_default.sources
  ADD COLUMN IF NOT EXISTS auto_tagging_status TEXT;

-- Possible values: NULL (not started/disabled) | 'PENDING' | 'PROCESSING' | 'PENDING_REVIEW' | 'COMPLETED' | 'FAILED'

-- ============================================
-- 3. Update auto_tagging_enabled default
-- ============================================

-- Change default from FALSE to TRUE for new projects
ALTER TABLE tenant_default.projects
  ALTER COLUMN auto_tagging_enabled SET DEFAULT TRUE;

-- Enable auto-tagging for existing projects that have it set to NULL
UPDATE tenant_default.projects
  SET auto_tagging_enabled = TRUE
  WHERE auto_tagging_enabled IS NULL;

-- ============================================
-- Rollback Instructions
-- ============================================

-- To rollback this migration:
-- DROP TABLE IF EXISTS tenant_default.ai_highlight_suggestions;
-- ALTER TABLE tenant_default.sources DROP COLUMN IF EXISTS auto_tagging_status;
-- ALTER TABLE tenant_default.projects ALTER COLUMN auto_tagging_enabled SET DEFAULT FALSE;
