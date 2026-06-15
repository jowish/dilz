-- ============================================================
-- Dilz — deal-images storage bucket setup
-- Run this in your Supabase project's SQL Editor.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1. Create the public bucket (or update if already exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-images', 'deal-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Public read access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public can read deal images'
  ) THEN
    CREATE POLICY "Public can read deal images"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'deal-images');
  END IF;
END $$;

-- 3. Authenticated upload to own folder only
--    Path format: {user_id}/{timestamp}-{random}.jpg
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload deal images'
  ) THEN
    CREATE POLICY "Authenticated users can upload deal images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'deal-images'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- 4. Users can update their own images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can update own deal images'
  ) THEN
    CREATE POLICY "Users can update own deal images"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'deal-images'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- 5. Users can delete their own images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can delete own deal images'
  ) THEN
    CREATE POLICY "Users can delete own deal images"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'deal-images'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;
