-- Add selected_text column to highlights table
-- This stores the exact text the user selected when creating the highlight
-- Optional for backwards compatibility with existing highlights

ALTER TABLE "highlights" ADD COLUMN "selected_text" TEXT;
