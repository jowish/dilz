-- Dilz deal lifecycle (P0.2). Run in the Supabase SQL Editor. Safe to run repeatedly.
--
-- ⚠️ REVIEW THE RLS POLICIES BELOW LINE BY LINE BEFORE RUNNING.
-- Per AGENTS.md §4, row level security is the only thing standing between one
-- merchant and another merchant's data, and an agent must not be trusted with
-- it unreviewed. Every policy here is spelled out rather than inherited.
--
-- What this adds:
--   1. Freshness columns on bons_plans. `statut` is left completely alone: it
--      is the moderation state (pending/actif/rejete) and means something
--      different from "is this deal still worth acting on".
--   2. deal_availability_confirmations — one row per user per deal, holding
--      their "still available? yes/no" answer.
--   3. Denormalised counters on bons_plans so the feed never has to join or
--      count per row (the feed query is on the hot path).
--
-- Existing rows stay valid: every column is nullable or defaulted, and
-- lib/dealLifecycle.js treats a row with none of them as ACTIVE.

-- ── 1. Freshness columns ────────────────────────────────────────────────────
ALTER TABLE bons_plans ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE bons_plans ADD COLUMN IF NOT EXISTS last_reported_unavailable_at TIMESTAMPTZ;
ALTER TABLE bons_plans ADD COLUMN IF NOT EXISTS availability_yes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bons_plans ADD COLUMN IF NOT EXISTS availability_no_count INTEGER NOT NULL DEFAULT 0;

-- Admin escape hatch: explicitly force a deal active or expired regardless of
-- dates and community reports. NULL means "derive it normally".
ALTER TABLE bons_plans ADD COLUMN IF NOT EXISTS lifecycle_override TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bons_plans_lifecycle_override_check'
  ) THEN
    ALTER TABLE bons_plans
      ADD CONSTRAINT bons_plans_lifecycle_override_check
      CHECK (lifecycle_override IS NULL OR lifecycle_override IN ('active', 'expired'));
  END IF;
END $$;

-- ── 2. Community availability confirmations ─────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_availability_confirmations (
  id           BIGSERIAL PRIMARY KEY,
  bon_plan_id  BIGINT NOT NULL REFERENCES bons_plans(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One answer per person per deal; answering again updates that same row so a
  -- single user cannot stack reports to bury a deal.
  UNIQUE (bon_plan_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_availability_deal
  ON deal_availability_confirmations(bon_plan_id);

ALTER TABLE deal_availability_confirmations ENABLE ROW LEVEL SECURITY;

-- Anyone may read confirmations (they are aggregate community signal, and the
-- counts are shown publicly on the deal).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'deal_availability_confirmations'
      AND policyname = 'Anyone can view availability confirmations'
  ) THEN
    CREATE POLICY "Anyone can view availability confirmations"
    ON deal_availability_confirmations FOR SELECT
    USING (true);
  END IF;
END $$;

-- A signed-in user may record their own answer, and only their own.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'deal_availability_confirmations'
      AND policyname = 'Users insert their own availability answer'
  ) THEN
    CREATE POLICY "Users insert their own availability answer"
    ON deal_availability_confirmations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'deal_availability_confirmations'
      AND policyname = 'Users update their own availability answer'
  ) THEN
    CREATE POLICY "Users update their own availability answer"
    ON deal_availability_confirmations FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT ON deal_availability_confirmations TO authenticated, anon;
GRANT INSERT, UPDATE ON deal_availability_confirmations TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE deal_availability_confirmations_id_seq TO authenticated;
GRANT ALL ON deal_availability_confirmations TO service_role;

-- ── 3. Keep the denormalised counters in step ───────────────────────────────
-- The counters on bons_plans are derived, never client-written: the API uses
-- the service role, and no UPDATE grant on bons_plans is added here.
CREATE OR REPLACE FUNCTION refresh_deal_availability_counters(p_bon_plan_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bons_plans b
  SET
    availability_yes_count = COALESCE(counts.yes_count, 0),
    availability_no_count  = COALESCE(counts.no_count, 0),
    last_verified_at = counts.last_yes_at,
    last_reported_unavailable_at = counts.last_no_at
  FROM (
    SELECT
      COUNT(*) FILTER (WHERE is_available)            AS yes_count,
      COUNT(*) FILTER (WHERE NOT is_available)        AS no_count,
      MAX(updated_at) FILTER (WHERE is_available)     AS last_yes_at,
      MAX(updated_at) FILTER (WHERE NOT is_available) AS last_no_at
    FROM deal_availability_confirmations
    WHERE bon_plan_id = p_bon_plan_id
  ) AS counts
  WHERE b.id = p_bon_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_refresh_deal_availability_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM refresh_deal_availability_counters(COALESCE(NEW.bon_plan_id, OLD.bon_plan_id));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS deal_availability_counters ON deal_availability_confirmations;
CREATE TRIGGER deal_availability_counters
AFTER INSERT OR UPDATE OR DELETE ON deal_availability_confirmations
FOR EACH ROW EXECUTE FUNCTION trg_refresh_deal_availability_counters();

-- Feed ordering support: expired deals must stop competing with live ones.
CREATE INDEX IF NOT EXISTS idx_bons_plans_date_fin ON bons_plans(date_fin);
