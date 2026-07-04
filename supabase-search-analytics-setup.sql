-- ============================================================
-- Dilz - search analytics for real popular alert suggestions
-- Run in your Supabase project's SQL Editor.
-- Safe to run multiple times (idempotent).
-- ============================================================

CREATE TABLE IF NOT EXISTS search_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID,
  query            TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_events_normalized_created
  ON search_events(normalized_query, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_events_created
  ON search_events(created_at DESC);

ALTER TABLE search_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'search_events' AND policyname = 'Service role manages search events'
  ) THEN
    CREATE POLICY "Service role manages search events"
    ON search_events FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;
