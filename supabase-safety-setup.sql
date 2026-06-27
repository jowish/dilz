-- Dilz App Store safety: content reports and user blocking.
-- Run in the Supabase SQL Editor. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS content_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type     TEXT NOT NULL CHECK (content_type IN ('deal', 'comment', 'user')),
  content_id       TEXT NOT NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason           TEXT NOT NULL CHECK (reason IN ('expired', 'rules', 'spam', 'scam', 'abuse', 'hate', 'inappropriate', 'copyright', 'other')),
  details          TEXT CHECK (details IS NULL OR CHAR_LENGTH(details) <= 1000),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reporter_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status
  ON content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user
  ON content_reports(reported_user_id, created_at DESC);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'content_reports' AND policyname = 'Users read own reports'
  ) THEN
    CREATE POLICY "Users read own reports"
    ON content_reports FOR SELECT TO authenticated
    USING (reporter_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'content_reports' AND policyname = 'Users create own reports'
  ) THEN
    CREATE POLICY "Users create own reports"
    ON content_reports FOR INSERT TO authenticated
    WITH CHECK (reporter_id = auth.uid());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_user_id),
  CHECK (blocker_id <> blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked
  ON blocked_users(blocked_user_id);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blocked_users' AND policyname = 'Users manage own blocks'
  ) THEN
    CREATE POLICY "Users manage own blocks"
    ON blocked_users FOR ALL TO authenticated
    USING (blocker_id = auth.uid())
    WITH CHECK (blocker_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT ON content_reports TO authenticated;
GRANT SELECT, INSERT, DELETE ON blocked_users TO authenticated;
GRANT ALL ON content_reports, blocked_users TO service_role;

DO $$ BEGIN
  ALTER TABLE content_reports DROP CONSTRAINT IF EXISTS content_reports_reason_check;
  ALTER TABLE content_reports ADD CONSTRAINT content_reports_reason_check
    CHECK (reason IN ('expired', 'rules', 'spam', 'scam', 'abuse', 'hate', 'inappropriate', 'copyright', 'other'));
END $$;
