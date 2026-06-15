-- ============================================================
-- Dilz — votes table + commentaires auteur_id
-- Run this in your Supabase project's SQL Editor.
-- It is safe to run multiple times (idempotent).
-- ============================================================

-- 1. Votes table — one vote per user per deal
CREATE TABLE IF NOT EXISTS bons_plans_votes (
  bon_plan_id  BIGINT NOT NULL REFERENCES bons_plans(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('chaud', 'froid')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bon_plan_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bpv_bon_plan ON bons_plans_votes(bon_plan_id);
CREATE INDEX IF NOT EXISTS idx_bpv_user     ON bons_plans_votes(user_id);

-- RLS for bons_plans_votes
ALTER TABLE bons_plans_votes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all votes (for counting)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bons_plans_votes' AND policyname = 'Authenticated users can read votes'
  ) THEN
    CREATE POLICY "Authenticated users can read votes"
    ON bons_plans_votes FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Users can insert/update/delete their own votes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bons_plans_votes' AND policyname = 'Users manage own votes'
  ) THEN
    CREATE POLICY "Users manage own votes"
    ON bons_plans_votes FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;


-- 2. Add auteur_id to commentaires (if not already present)
ALTER TABLE commentaires ADD COLUMN IF NOT EXISTS auteur_id UUID;

CREATE INDEX IF NOT EXISTS idx_commentaires_auteur ON commentaires(auteur_id);
