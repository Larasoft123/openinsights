-- Remove legacy business data tables from public schema
-- These have been migrated to tenant-specific schemas (e.g., tenant_default)
--
-- WARNING: This is destructive! Ensure all data has been migrated to tenant schemas first.
-- Run the migration script (scripts/migrate-to-multi-tenant.ts) before applying this migration.

-- Drop in correct order (respect foreign key constraints)
DROP TABLE IF EXISTS "highlight_themes" CASCADE;
DROP TABLE IF EXISTS "highlights" CASCADE;
DROP TABLE IF EXISTS "themes" CASCADE;
DROP TABLE IF EXISTS "tags" CASCADE;
DROP TABLE IF EXISTS "share_links" CASCADE;
DROP TABLE IF EXISTS "speaker_names" CASCADE;
DROP TABLE IF EXISTS "transcript_segments" CASCADE;
DROP TABLE IF EXISTS "sources" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;

-- Remove workspace reference from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "workspace_id";

-- Drop workspaces table
DROP TABLE IF EXISTS "workspaces" CASCADE;

-- Drop unused enums (now defined in tenant schema)
DROP TYPE IF EXISTS "ProcessingStatus";
DROP TYPE IF EXISTS "SummaryStatus";
