-- Dilz supermarket discovery: product categories and persistent votes.
-- Run after supabase-core-setup.sql. Safe to run multiple times.

ALTER TABLE produits ADD COLUMN IF NOT EXISTS categorie TEXT;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS votes_chaud INTEGER NOT NULL DEFAULT 0;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS votes_froid INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_produits_categorie ON produits(categorie);
CREATE INDEX IF NOT EXISTS idx_produits_created_at ON produits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_produits_votes
  ON produits(votes_chaud DESC, votes_froid ASC);

CREATE TABLE IF NOT EXISTS product_votes (
  barcode    TEXT NOT NULL REFERENCES produits(barcode) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('chaud', 'froid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (barcode, user_id)
);

CREATE INDEX IF NOT EXISTS idx_product_votes_user ON product_votes(user_id);
ALTER TABLE product_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'product_votes' AND policyname = 'Authenticated users read product votes'
  ) THEN
    CREATE POLICY "Authenticated users read product votes"
    ON product_votes FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'product_votes' AND policyname = 'Users manage own product votes'
  ) THEN
    CREATE POLICY "Users manage own product votes"
    ON product_votes FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cast_product_vote(
  p_barcode TEXT,
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

  PERFORM 1 FROM produits WHERE barcode = p_barcode FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  SELECT type INTO previous_type
  FROM product_votes
  WHERE barcode = p_barcode AND user_id = p_user_id
  FOR UPDATE;

  next_type := CASE WHEN previous_type = p_type THEN NULL ELSE p_type END;

  IF next_type IS NULL THEN
    DELETE FROM product_votes
    WHERE barcode = p_barcode AND user_id = p_user_id;
  ELSE
    INSERT INTO product_votes (barcode, user_id, type)
    VALUES (p_barcode, p_user_id, next_type)
    ON CONFLICT (barcode, user_id)
    DO UPDATE SET type = EXCLUDED.type, created_at = NOW();
  END IF;

  UPDATE produits
  SET
    votes_chaud = GREATEST(
      0,
      COALESCE(produits.votes_chaud, 0)
      - CASE WHEN previous_type = 'chaud' THEN 1 ELSE 0 END
      + CASE WHEN next_type = 'chaud' THEN 1 ELSE 0 END
    ),
    votes_froid = GREATEST(
      0,
      COALESCE(produits.votes_froid, 0)
      - CASE WHEN previous_type = 'froid' THEN 1 ELSE 0 END
      + CASE WHEN next_type = 'froid' THEN 1 ELSE 0 END
    )
  WHERE barcode = p_barcode
  RETURNING produits.votes_chaud, produits.votes_froid
  INTO votes_chaud, votes_froid;

  new_type := next_type;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.cast_product_vote(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cast_product_vote(TEXT, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.cast_product_vote(TEXT, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cast_product_vote(TEXT, UUID, TEXT) TO service_role;

GRANT SELECT ON product_votes TO authenticated;
GRANT ALL ON product_votes TO service_role;
