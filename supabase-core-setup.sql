-- Dilz core schema
-- Run this first in the Supabase SQL Editor on a new project.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS produits (
  barcode TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  nom_en TEXT,
  image TEXT,
  categorie TEXT,
  votes_chaud INTEGER NOT NULL DEFAULT 0 CHECK (votes_chaud >= 0),
  votes_froid INTEGER NOT NULL DEFAULT 0 CHECK (votes_froid >= 0),
  image_source TEXT,
  image_status TEXT NOT NULL DEFAULT 'pending',
  image_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS magasins (
  id BIGSERIAL PRIMARY KEY,
  enseigne_code TEXT NOT NULL,
  store_id TEXT NOT NULL,
  nom TEXT,
  adresse TEXT,
  ville TEXT,
  ville_normalisee TEXT GENERATED ALWAYS AS (NULLIF(BTRIM(ville), '')) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enseigne_code, store_id)
);

CREATE TABLE IF NOT EXISTS prix (
  id BIGSERIAL PRIMARY KEY,
  barcode TEXT NOT NULL REFERENCES produits(barcode) ON DELETE CASCADE,
  enseigne_code TEXT NOT NULL,
  store_id TEXT NOT NULL,
  prix NUMERIC(12, 2) NOT NULL CHECK (prix >= 0),
  quantite TEXT,
  unite TEXT,
  mis_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (barcode, enseigne_code, store_id)
);

CREATE TABLE IF NOT EXISTS promotions (
  id BIGSERIAL PRIMARY KEY,
  barcode TEXT NOT NULL REFERENCES produits(barcode) ON DELETE CASCADE,
  enseigne_code TEXT NOT NULL,
  store_id TEXT NOT NULL,
  prix_promo NUMERIC(12, 2) NOT NULL CHECK (prix_promo >= 0),
  description TEXT NOT NULL,
  date_debut TIMESTAMPTZ,
  date_fin TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (barcode, enseigne_code, store_id)
);

CREATE TABLE IF NOT EXISTS bons_plans (
  id BIGSERIAL PRIMARY KEY,
  titre TEXT NOT NULL CHECK (CHAR_LENGTH(titre) <= 160),
  description TEXT CHECK (description IS NULL OR CHAR_LENGTH(description) <= 2000),
  prix NUMERIC(12, 2) NOT NULL CHECK (prix >= 0),
  prix_original NUMERIC(12, 2) CHECK (prix_original IS NULL OR prix_original >= 0),
  magasin TEXT NOT NULL CHECK (CHAR_LENGTH(magasin) <= 120),
  ville TEXT,
  categorie TEXT CHECK (categorie IS NULL OR categorie IN ('Food', 'Tech', 'Fashion', 'Activities', 'Online')),
  url_source TEXT,
  image_url TEXT,
  auteur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  auteur_nom TEXT,
  votes_chaud INTEGER NOT NULL DEFAULT 0 CHECK (votes_chaud >= 0),
  votes_froid INTEGER NOT NULL DEFAULT 0 CHECK (votes_froid >= 0),
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('pending', 'actif', 'rejete')),
  date_debut DATE,
  date_fin DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (date_debut IS NULL OR date_fin IS NULL OR date_fin >= date_debut)
);

CREATE TABLE IF NOT EXISTS commentaires (
  id BIGSERIAL PRIMARY KEY,
  bon_plan_id BIGINT NOT NULL REFERENCES bons_plans(id) ON DELETE CASCADE,
  auteur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  auteur_nom TEXT NOT NULL,
  contenu TEXT NOT NULL CHECK (CHAR_LENGTH(contenu) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prix_barcode ON prix(barcode);
CREATE INDEX IF NOT EXISTS idx_produits_categorie ON produits(categorie);
CREATE INDEX IF NOT EXISTS idx_produits_votes ON produits(votes_chaud DESC, votes_froid ASC);
CREATE INDEX IF NOT EXISTS idx_prix_store ON prix(enseigne_code, store_id);
CREATE INDEX IF NOT EXISTS idx_promotions_barcode ON promotions(barcode);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_magasins_ville ON magasins(ville_normalisee);
CREATE INDEX IF NOT EXISTS idx_bons_plans_status_created ON bons_plans(statut, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bons_plans_city ON bons_plans(ville);
CREATE INDEX IF NOT EXISTS idx_bons_plans_author ON bons_plans(auteur_id);
CREATE INDEX IF NOT EXISTS idx_commentaires_deal ON commentaires(bon_plan_id, created_at);

ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE magasins ENABLE ROW LEVEL SECURITY;
ALTER TABLE prix ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bons_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commentaires ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'produits' AND policyname = 'Public reads products') THEN
    CREATE POLICY "Public reads products" ON produits FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'magasins' AND policyname = 'Public reads stores') THEN
    CREATE POLICY "Public reads stores" ON magasins FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prix' AND policyname = 'Public reads prices') THEN
    CREATE POLICY "Public reads prices" ON prix FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promotions' AND policyname = 'Public reads promotions') THEN
    CREATE POLICY "Public reads promotions" ON promotions FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bons_plans' AND policyname = 'Public reads active deals') THEN
    CREATE POLICY "Public reads active deals" ON bons_plans FOR SELECT TO anon, authenticated USING (statut = 'actif');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'commentaires' AND policyname = 'Public reads comments') THEN
    CREATE POLICY "Public reads comments" ON commentaires FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

GRANT SELECT ON produits, magasins, prix, promotions, bons_plans, commentaires TO anon, authenticated;
GRANT ALL ON produits, magasins, prix, promotions, bons_plans, commentaires TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
