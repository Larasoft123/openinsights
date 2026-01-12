-- AlterTable: Add archive (soft delete) support for projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

-- CreateIndex: Partial index for active projects
CREATE INDEX IF NOT EXISTS "projects_active_idx" ON "projects"("workspace_id") WHERE "archived_at" IS NULL;
