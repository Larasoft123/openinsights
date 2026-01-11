-- ============================================
-- TENANT SCHEMA TEMPLATE
-- Variables: {{schema_name}}, {{embedding_dimension}}
-- ============================================

-- Create tenant schema
CREATE SCHEMA IF NOT EXISTS {{schema_name}};

-- ============================================
-- WORKSPACES
-- ============================================

CREATE TABLE {{schema_name}}.workspaces (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,

  -- AI Settings (null = use organization defaults)
  ai_provider TEXT,
  openai_transcription_model TEXT,
  embedding_provider TEXT,

  -- API Keys (null = use organization keys)
  gemini_api_key TEXT,
  openai_api_key TEXT,
  ollama_base_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT workspaces_slug_unique UNIQUE (slug)
);

-- ============================================
-- WORKSPACE MEMBERS
-- ============================================

CREATE TABLE {{schema_name}}.workspace_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL REFERENCES {{schema_name}}.workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor', -- 'owner' | 'editor' | 'viewer'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT workspace_members_unique UNIQUE (workspace_id, user_id)
);

CREATE INDEX workspace_members_user_id_idx ON {{schema_name}}.workspace_members(user_id);

-- ============================================
-- PROJECTS
-- ============================================

CREATE TABLE {{schema_name}}.projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL REFERENCES {{schema_name}}.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- AI Summary
  summary JSONB,
  summary_status TEXT DEFAULT 'PENDING', -- PENDING | GENERATING | COMPLETED | FAILED
  summary_generated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX projects_workspace_id_idx ON {{schema_name}}.projects(workspace_id);

-- ============================================
-- SOURCES
-- ============================================

CREATE TABLE {{schema_name}}.sources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES {{schema_name}}.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  duration INT, -- Duration in seconds
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | UPLOADING | PROCESSING | COMPLETED | FAILED

  -- Processing progress tracking
  processing_step TEXT, -- 'transcribing' | 'vectorizing'
  processing_progress INT DEFAULT 0, -- 0-100
  processing_started_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- AI Summary
  summary JSONB,
  summary_status TEXT DEFAULT 'PENDING',
  summary_generated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sources_project_id_idx ON {{schema_name}}.sources(project_id);
CREATE INDEX sources_project_id_active_idx ON {{schema_name}}.sources(project_id) WHERE deleted_at IS NULL;

-- ============================================
-- TRANSCRIPT SEGMENTS (with pgvector)
-- ============================================

CREATE TABLE {{schema_name}}.transcript_segments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source_id TEXT NOT NULL REFERENCES {{schema_name}}.sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  start_time DOUBLE PRECISION NOT NULL,
  end_time DOUBLE PRECISION NOT NULL,
  speaker_id TEXT,
  embedding vector({{embedding_dimension}}),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX transcript_segments_source_id_idx ON {{schema_name}}.transcript_segments(source_id);

-- HNSW index for fast vector similarity search
CREATE INDEX {{schema_name}}_segments_embedding_idx
  ON {{schema_name}}.transcript_segments
  USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- TAGS
-- ============================================

CREATE TABLE {{schema_name}}.tags (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES {{schema_name}}.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tags_project_name_unique UNIQUE (project_id, name)
);

-- ============================================
-- THEMES
-- ============================================

CREATE TABLE {{schema_name}}.themes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES {{schema_name}}.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366F1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT themes_project_name_unique UNIQUE (project_id, name)
);

-- ============================================
-- HIGHLIGHTS
-- ============================================

CREATE TABLE {{schema_name}}.highlights (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  segment_id TEXT NOT NULL REFERENCES {{schema_name}}.transcript_segments(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES {{schema_name}}.tags(id) ON DELETE CASCADE,
  note TEXT,
  selected_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX highlights_segment_id_idx ON {{schema_name}}.highlights(segment_id);
CREATE INDEX highlights_tag_id_idx ON {{schema_name}}.highlights(tag_id);

-- ============================================
-- HIGHLIGHT-THEME JUNCTION
-- ============================================

CREATE TABLE {{schema_name}}.highlight_themes (
  highlight_id TEXT NOT NULL REFERENCES {{schema_name}}.highlights(id) ON DELETE CASCADE,
  theme_id TEXT NOT NULL REFERENCES {{schema_name}}.themes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (highlight_id, theme_id)
);

-- ============================================
-- SHARE LINKS
-- ============================================

CREATE TABLE {{schema_name}}.share_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES {{schema_name}}.projects(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES {{schema_name}}.sources(id) ON DELETE CASCADE, -- null = project share
  share_type TEXT NOT NULL, -- 'project' | 'source'
  include_evidence BOOLEAN NOT NULL DEFAULT true,
  include_insights BOOLEAN NOT NULL DEFAULT true,
  created_by_id TEXT NOT NULL REFERENCES public.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX share_links_token_idx ON {{schema_name}}.share_links(token);
CREATE INDEX share_links_project_id_idx ON {{schema_name}}.share_links(project_id);
CREATE INDEX share_links_source_id_idx ON {{schema_name}}.share_links(source_id);

-- ============================================
-- SPEAKER NAMES
-- ============================================

CREATE TABLE {{schema_name}}.speaker_names (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES {{schema_name}}.projects(id) ON DELETE CASCADE,
  speaker_id TEXT NOT NULL, -- Raw speaker ID from transcription
  custom_name TEXT NOT NULL, -- User-assigned name
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT speaker_names_project_speaker_unique UNIQUE (project_id, speaker_id)
);

-- ============================================
-- UPDATE TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION {{schema_name}}.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all tables with updated_at
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON {{schema_name}}.workspaces
  FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at();

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON {{schema_name}}.projects
  FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at();

CREATE TRIGGER sources_updated_at BEFORE UPDATE ON {{schema_name}}.sources
  FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at();

CREATE TRIGGER transcript_segments_updated_at BEFORE UPDATE ON {{schema_name}}.transcript_segments
  FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at();

CREATE TRIGGER tags_updated_at BEFORE UPDATE ON {{schema_name}}.tags
  FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at();

CREATE TRIGGER themes_updated_at BEFORE UPDATE ON {{schema_name}}.themes
  FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at();

CREATE TRIGGER highlights_updated_at BEFORE UPDATE ON {{schema_name}}.highlights
  FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at();

CREATE TRIGGER share_links_updated_at BEFORE UPDATE ON {{schema_name}}.share_links
  FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at();

CREATE TRIGGER speaker_names_updated_at BEFORE UPDATE ON {{schema_name}}.speaker_names
  FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at();
