-- Dilz exact deal locations. Run in Supabase SQL Editor. Safe to run repeatedly.

ALTER TABLE bons_plans ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE bons_plans ADD COLUMN IF NOT EXISTS latitude NUMERIC(9, 6);
ALTER TABLE bons_plans ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6);

ALTER TABLE bons_plans DROP CONSTRAINT IF EXISTS bons_plans_adresse_length;
ALTER TABLE bons_plans ADD CONSTRAINT bons_plans_adresse_length
  CHECK (adresse IS NULL OR CHAR_LENGTH(adresse) <= 300);

ALTER TABLE bons_plans DROP CONSTRAINT IF EXISTS bons_plans_latitude_israel;
ALTER TABLE bons_plans ADD CONSTRAINT bons_plans_latitude_israel
  CHECK (latitude IS NULL OR latitude BETWEEN 29.3 AND 33.6);

ALTER TABLE bons_plans DROP CONSTRAINT IF EXISTS bons_plans_longitude_israel;
ALTER TABLE bons_plans ADD CONSTRAINT bons_plans_longitude_israel
  CHECK (longitude IS NULL OR longitude BETWEEN 34.1 AND 35.95);

CREATE INDEX IF NOT EXISTS idx_bons_plans_location ON bons_plans(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
