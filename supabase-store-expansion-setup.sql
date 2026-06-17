-- Dilz store expansion metadata.
-- Run after supabase-core-setup.sql if your project has an enseignes table.
-- Safe to run multiple times.

INSERT INTO enseignes (code, nom)
VALUES
  ('be', 'BE'),
  ('super_pharm', 'Super-Pharm'),
  ('good_pharm', 'Good Pharm')
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom;
