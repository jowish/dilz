-- Dilz user contribution points (issue #45). Run in Supabase SQL Editor. Safe to run repeatedly.
-- Points are entirely server-computed (see lib/points.js, called from the vote
-- handler in pages/api/bons-plans.js) — no INSERT/UPDATE/DELETE grant to
-- authenticated/anon below, so no client can set them directly.

CREATE TABLE IF NOT EXISTS user_points (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points     INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_points' AND policyname = 'Anyone can view points'
  ) THEN
    CREATE POLICY "Anyone can view points"
    ON user_points FOR SELECT
    USING (true);
  END IF;
END $$;

GRANT SELECT ON user_points TO authenticated, anon;
GRANT ALL ON user_points TO service_role;
