-- Dilz native iOS push tokens.
-- Run in the Supabase SQL Editor. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS native_push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  token      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform, token)
);

CREATE INDEX IF NOT EXISTS idx_native_push_tokens_user
  ON native_push_tokens(user_id);

ALTER TABLE native_push_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'native_push_tokens' AND policyname = 'Users manage own native push tokens'
  ) THEN
    CREATE POLICY "Users manage own native push tokens"
    ON native_push_tokens FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON native_push_tokens TO authenticated;
GRANT ALL ON native_push_tokens TO service_role;
