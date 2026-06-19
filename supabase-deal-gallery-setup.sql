-- Dilz deal gallery: up to three photos per community deal.
-- Run after supabase-core-setup.sql. Safe to run multiple times.

ALTER TABLE bons_plans
  ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE bons_plans
SET image_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL
  AND image_url <> ''
  AND image_urls = '[]'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bons_plans_image_urls_valid'
  ) THEN
    ALTER TABLE bons_plans
      ADD CONSTRAINT bons_plans_image_urls_valid
      CHECK (
        jsonb_typeof(image_urls) = 'array'
        AND jsonb_array_length(image_urls) <= 3
      );
  END IF;
END $$;
