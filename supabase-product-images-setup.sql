-- Dilz product image enrichment metadata.
-- Run once after supabase-core-setup.sql, or on the existing products table.

ALTER TABLE produits ADD COLUMN IF NOT EXISTS image_source TEXT;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS image_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE produits ADD COLUMN IF NOT EXISTS image_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_produits_image_status
  ON produits(image_status, image_checked_at)
  WHERE image IS NULL;

UPDATE produits
SET
  image_source = CASE
    WHEN image LIKE '%rami-levy.co.il%' THEN 'rami_levy'
    WHEN image LIKE '%openfoodfacts.org%' THEN 'open_food_facts'
    WHEN image LIKE '%shufersal%' OR image LIKE '%res.cloudinary.com/shufersal/%' THEN 'shufersal'
    WHEN image LIKE '%/storage/v1/object/public/product-images/%' THEN 'cached'
    ELSE COALESCE(image_source, 'existing')
  END,
  image_status = 'found',
  image_checked_at = COALESCE(image_checked_at, NOW())
WHERE image IS NOT NULL AND image <> '';
