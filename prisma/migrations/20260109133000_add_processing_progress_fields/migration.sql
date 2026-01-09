-- AddProcessingProgressFields
-- Adds columns to track processing progress for sources

ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "processing_step" TEXT;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "processing_progress" INTEGER;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "processing_started_at" TIMESTAMP(3);
