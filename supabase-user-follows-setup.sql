-- Dilz user follows and author notifications.
-- Run after supabase-alerts-setup.sql. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_name   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, followed_user_id),
  CHECK (follower_id <> followed_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_followed
  ON user_follows(followed_user_id, created_at DESC);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_follows' AND policyname = 'Users manage own follows'
  ) THEN
    CREATE POLICY "Users manage own follows"
    ON user_follows FOR ALL TO authenticated
    USING (follower_id = auth.uid())
    WITH CHECK (follower_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT, DELETE ON user_follows TO authenticated;
GRANT ALL ON user_follows TO service_role;

ALTER TABLE notifications ALTER COLUMN alert_id DROP NOT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type TEXT NOT NULL DEFAULT 'alert';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS followed_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
      CHECK (notification_type IN ('alert', 'follow'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_follow_deal
  ON notifications(user_id, followed_user_id, deal_id);
