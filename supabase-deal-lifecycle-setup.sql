-- Dilz deal lifecycle (P0.2). Run in the Supabase SQL Editor. Safe to run repeatedly.
--
-- ⚠️ ROW LEVEL SECURITY BELOW — READ IT LINE BY LINE.
-- Per AGENTS.md §4, RLS is the only thing standing between one merchant and
-- another merchant's data. Every policy here is spelled out rather than
-- inherited, and deliberately no looser than the existing votes setup.
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
-- No separate index on bon_plan_id: the UNIQUE constraint below already
-- indexes it as the leading column.
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

ALTER TABLE deal_availability_confirmations ENABLE ROW LEVEL SECURITY;

-- A signed-in user may read only their OWN answer, so nobody can enumerate who
-- reported a deal as gone. The public tally is served from the denormalised
-- availability_yes_count / availability_no_count columns on bons_plans, which
-- are already readable as part of the deal itself.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'deal_availability_confirmations'
      AND policyname = 'Users read their own availability answer'
  ) THEN
    CREATE POLICY "Users read their own availability answer"
    ON deal_availability_confirmations FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
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

-- No grants to anon: an anonymous visitor reads the public tally from the deal
-- row, never this table.
GRANT SELECT, INSERT, UPDATE ON deal_availability_confirmations TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE deal_availability_confirmations_id_seq TO authenticated;
GRANT ALL ON deal_availability_confirmations TO service_role;

-- ── 3. Keep the denormalised counters in step ───────────────────────────────
-- The counters on bons_plans are derived, never client-written: no UPDATE
-- grant on bons_plans is added here, and the API writes with the service role.
CREATE OR REPLACE FUNCTION refresh_deal_availability_counters(p_bon_plan_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  -- Aggregates over an empty set still yield one row (0 / NULL), so removing
  -- the last confirmation correctly resets the deal's counters.
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
$fn$;

CREATE OR REPLACE FUNCTION trg_refresh_deal_availability_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM refresh_deal_availability_counters(COALESCE(NEW.bon_plan_id, OLD.bon_plan_id));
  RETURN NULL;
END;
$fn$;

-- Flipping an answer must move its timestamp, otherwise the lifecycle would
-- keep reading a stale "last reported" time.
CREATE OR REPLACE FUNCTION trg_touch_deal_availability_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$fn$;

-- These helpers are only ever needed by their triggers, which run as the
-- definer regardless. Revoking from PUBLIC alone is NOT enough: Supabase
-- grants EXECUTE to anon and authenticated explicitly, so without naming them
-- the functions stay callable over /rest/v1/rpc — the database linter flags
-- exactly that.
REVOKE ALL ON FUNCTION refresh_deal_availability_counters(BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION trg_refresh_deal_availability_counters() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION trg_touch_deal_availability_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS deal_availability_touch_updated_at ON deal_availability_confirmations;
CREATE TRIGGER deal_availability_touch_updated_at
BEFORE UPDATE ON deal_availability_confirmations
FOR EACH ROW EXECUTE FUNCTION trg_touch_deal_availability_updated_at();

DROP TRIGGER IF EXISTS deal_availability_counters ON deal_availability_confirmations;
CREATE TRIGGER deal_availability_counters
AFTER INSERT OR UPDATE OR DELETE ON deal_availability_confirmations
FOR EACH ROW EXECUTE FUNCTION trg_refresh_deal_availability_counters();

-- Supports the active-feed filter that keeps expired deals from competing.
CREATE INDEX IF NOT EXISTS idx_bons_plans_date_fin ON bons_plans(date_fin);
