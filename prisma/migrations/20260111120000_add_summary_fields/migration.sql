-- CreateEnum
CREATE TYPE "SummaryStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- AlterTable: Add summary fields to projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "summary" JSONB;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "summary_status" "SummaryStatus";
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "summary_generated_at" TIMESTAMP(3);

-- AlterTable: Add summary fields to sources
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "summary" JSONB;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "summary_status" "SummaryStatus";
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "summary_generated_at" TIMESTAMP(3);
