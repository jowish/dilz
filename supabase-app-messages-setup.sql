-- Dilz admin-managed banners and yellow notes.
-- Run in the Supabase SQL Editor. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS app_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type           TEXT NOT NULL DEFAULT 'banner' CHECK (type IN ('banner', 'yellow_note')),
  target         TEXT NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'web', 'ios')),
  title_en       TEXT CHECK (title_en IS NULL OR CHAR_LENGTH(title_en) <= 120),
  title_he       TEXT CHECK (title_he IS NULL OR CHAR_LENGTH(title_he) <= 120),
  body_en        TEXT NOT NULL CHECK (CHAR_LENGTH(body_en) BETWEEN 1 AND 500),
  body_he        TEXT NOT NULL CHECK (CHAR_LENGTH(body_he) BETWEEN 1 AND 500),
  cta_label_en   TEXT CHECK (cta_label_en IS NULL OR CHAR_LENGTH(cta_label_en) <= 80),
  cta_label_he   TEXT CHECK (cta_label_he IS NULL OR CHAR_LENGTH(cta_label_he) <= 80),
  cta_url        TEXT CHECK (cta_url IS NULL OR CHAR_LENGTH(cta_url) <= 2000),
  is_active      BOOLEAN NOT NULL DEFAULT false,
  dismissible    BOOLEAN NOT NULL DEFAULT true,
  starts_at      TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  priority       INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN -100 AND 100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_app_messages_live
  ON app_messages(is_active, priority DESC, created_at DESC);

ALTER TABLE app_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'app_messages' AND policyname = 'Public reads live app messages'
  ) THEN
    CREATE POLICY "Public reads live app messages"
    ON app_messages FOR SELECT TO anon, authenticated
    USING (
      is_active = true
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (ends_at IS NULL OR ends_at > NOW())
    );
  END IF;
END $$;

GRANT SELECT ON app_messages TO anon, authenticated;
GRANT ALL ON app_messages TO service_role;
