-- Dilz pinned deals and neutral in-feed ads. Run in Supabase SQL Editor. Safe to run repeatedly.
-- Schema only — no RLS/policy change. Pinned deals always sort first in the feed;
-- ad deals are display-only and rejected server-side from voting/commenting.

ALTER TABLE bons_plans ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bons_plans ADD COLUMN IF NOT EXISTS is_ad BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bons_plans_is_pinned ON bons_plans(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_bons_plans_is_ad ON bons_plans(is_ad) WHERE is_ad = TRUE;
