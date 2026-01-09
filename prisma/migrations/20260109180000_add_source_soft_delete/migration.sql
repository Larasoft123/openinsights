-- AlterTable: Add soft delete support for sources (trash functionality)
ALTER TABLE "sources" ADD COLUMN "deleted_at" TIMESTAMP(3);
