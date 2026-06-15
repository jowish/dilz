-- ============================================================
-- Dilz — votes table + commentaires auteur_id
-- Run this in your Supabase project's SQL Editor.
-- It is safe to run multiple times (idempotent).
-- ============================================================

-- 1. Votes table — one vote per user per deal
CREATE TABLE IF NOT EXISTS bons_plans_votes (
  bon_plan_id  BIGINT NOT NULL REFERENCES bons_plans(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Atomically toggle a vote and update cached counters. The API calls this
-- with the service role after verifying the user's access token.
CREATE OR REPLACE FUNCTION public.cast_bon_plan_vote(
  p_bon_plan_id BIGINT,
  p_user_id UUID,
  p_type TEXT
)
RETURNS TABLE (new_type TEXT, votes_chaud INTEGER, votes_froid INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_type TEXT;
  next_type TEXT;
BEGIN
  IF p_type NOT IN ('chaud', 'froid') THEN
    RAISE EXCEPTION 'Invalid vote type';
  END IF;

  PERFORM 1 FROM bons_plans WHERE id = p_bon_plan_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  SELECT type INTO previous_type
  FROM bons_plans_votes
  WHERE bon_plan_id = p_bon_plan_id AND user_id = p_user_id
  FOR UPDATE;

  next_type := CASE WHEN previous_type = p_type THEN NULL ELSE p_type END;

  IF next_type IS NULL THEN
    DELETE FROM bons_plans_votes
    WHERE bon_plan_id = p_bon_plan_id AND user_id = p_user_id;
  ELSE
    INSERT INTO bons_plans_votes (bon_plan_id, user_id, type)
    VALUES (p_bon_plan_id, p_user_id, next_type)
    ON CONFLICT (bon_plan_id, user_id)
    DO UPDATE SET type = EXCLUDED.type, created_at = NOW();
  END IF;

  UPDATE bons_plans
  SET
    votes_chaud = GREATEST(
      0,
      COALESCE(bons_plans.votes_chaud, 0)
      - CASE WHEN previous_type = 'chaud' THEN 1 ELSE 0 END
      + CASE WHEN next_type = 'chaud' THEN 1 ELSE 0 END
    ),
    votes_froid = GREATEST(
      0,
      COALESCE(bons_plans.votes_froid, 0)
      - CASE WHEN previous_type = 'froid' THEN 1 ELSE 0 END
      + CASE WHEN next_type = 'froid' THEN 1 ELSE 0 END
    )
  WHERE id = p_bon_plan_id
  RETURNING bons_plans.votes_chaud, bons_plans.votes_froid
  INTO votes_chaud, votes_froid;

  new_type := next_type;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.cast_bon_plan_vote(BIGINT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cast_bon_plan_vote(BIGINT, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.cast_bon_plan_vote(BIGINT, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cast_bon_plan_vote(BIGINT, UUID, TEXT) TO service_role;
