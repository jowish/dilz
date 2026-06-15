-- Dilz saved supermarket products and community deals.
-- Run after supabase-core-setup.sql. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS saved_items (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type  TEXT NOT NULL CHECK (item_type IN ('product', 'deal')),
  item_id    TEXT NOT NULL,
  snapshot   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user
  ON saved_items(user_id, created_at DESC);

ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'saved_items' AND policyname = 'Users manage own saved items'
  ) THEN
    CREATE POLICY "Users manage own saved items"
    ON saved_items FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON saved_items TO authenticated;
GRANT ALL ON saved_items TO service_role;
