-- Fix existing listing_images by assigning them to the first variant of each listing
-- This assumes each listing's images should belong to its first variant

-- Step 1: See which images need fixing
SELECT 
  li.image_id,
  li.listing_id,
  li.variant_id,
  li.image_url,
  gp.product_name,
  (SELECT variant_id FROM listing_variants WHERE listing_id = li.listing_id ORDER BY created_at ASC LIMIT 1) as suggested_variant_id
FROM listing_images li
LEFT JOIN seller_product_listings spl ON li.listing_id = spl.listing_id
LEFT JOIN global_products gp ON spl.global_product_id = gp.global_product_id
WHERE li.variant_id IS NULL
ORDER BY li.listing_id, li.sort_order;

-- Step 2: Update images to assign them to first variant of their listing
UPDATE listing_images
SET variant_id = (
  SELECT variant_id 
  FROM listing_variants 
  WHERE listing_variants.listing_id = listing_images.listing_id 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE variant_id IS NULL
AND listing_id IN (SELECT DISTINCT listing_id FROM listing_variants);

-- Step 3: Verify the fix
SELECT 
  COUNT(*) as total_images,
  COUNT(variant_id) as images_with_variant,
  COUNT(*) - COUNT(variant_id) as images_without_variant
FROM listing_images;

-- Step 4: Show updated images grouped by variant
SELECT 
  lv.variant_id,
  lv.variant_name,
  lv.listing_id,
  gp.product_name,
  COUNT(li.image_id) as image_count,
  array_agg(li.image_url) as image_urls
FROM listing_variants lv
LEFT JOIN listing_images li ON lv.variant_id = li.variant_id
LEFT JOIN seller_product_listings spl ON lv.listing_id = spl.listing_id
LEFT JOIN global_products gp ON spl.global_product_id = gp.global_product_id
WHERE li.image_id IS NOT NULL
GROUP BY lv.variant_id, lv.variant_name, lv.listing_id, gp.product_name
ORDER BY gp.product_name, lv.variant_name;
