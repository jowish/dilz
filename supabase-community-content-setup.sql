-- Dilz community promo codes and shopping engagement.
-- Run in Supabase SQL Editor. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  merchant TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promo_codes_created ON promo_codes(created_at DESC);
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promo_codes' AND policyname='Everyone reads promo codes') THEN
    CREATE POLICY "Everyone reads promo codes" ON promo_codes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promo_codes' AND policyname='Users create promo codes') THEN
    CREATE POLICY "Users create promo codes" ON promo_codes FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
  END IF;
END $$;
GRANT SELECT ON promo_codes TO anon, authenticated;
GRANT INSERT ON promo_codes TO authenticated;
GRANT ALL ON promo_codes TO service_role;

CREATE TABLE IF NOT EXISTS shopping_deal_votes (
  slug TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('chaud','froid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (slug,user_id)
);
CREATE TABLE IF NOT EXISTS shopping_deal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shopping_comments_slug ON shopping_deal_comments(slug,created_at DESC);
ALTER TABLE shopping_deal_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_deal_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shopping_deal_votes' AND policyname='Everyone reads shopping votes') THEN CREATE POLICY "Everyone reads shopping votes" ON shopping_deal_votes FOR SELECT USING(true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shopping_deal_votes' AND policyname='Users manage shopping votes') THEN CREATE POLICY "Users manage shopping votes" ON shopping_deal_votes FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid()); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shopping_deal_comments' AND policyname='Everyone reads shopping comments') THEN CREATE POLICY "Everyone reads shopping comments" ON shopping_deal_comments FOR SELECT USING(true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shopping_deal_comments' AND policyname='Users create shopping comments') THEN CREATE POLICY "Users create shopping comments" ON shopping_deal_comments FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid()); END IF;
END $$;
GRANT SELECT ON shopping_deal_votes, shopping_deal_comments TO anon, authenticated;
GRANT INSERT,UPDATE,DELETE ON shopping_deal_votes TO authenticated;
GRANT INSERT ON shopping_deal_comments TO authenticated;
GRANT ALL ON shopping_deal_votes, shopping_deal_comments TO service_role;
