-- Check if allergen records exist in database

-- 1. Check specific allergen IDs from variant
SELECT 
  'Checking specific IDs' as check_type,
  allergen_id,
  name,
  description
FROM allergens 
WHERE allergen_id IN (
  '73301aa4-b893-45f4-8fea-7fc3429461c0',
  'ebebf703-35a3-4c87-9c82-357f0ddfa1be'
);

-- 2. List all allergens in database
SELECT 
  'All allergens' as check_type,
  allergen_id,
  name,
  description
FROM allergens
ORDER BY name;

-- 3. Count total allergens
SELECT 
  'Total count' as check_type,
  COUNT(*) as total_allergens
FROM allergens;

-- 4. Check variant allergen_info
SELECT 
  variant_id,
  variant_name,
  allergen_info,
  (allergen_info->>'allergen_ids')::text as allergen_ids_raw,
  (allergen_info->>'custom_allergens')::text as custom_allergens_raw,
  (allergen_info->>'contains_allergens')::text as contains_allergens
FROM listing_variants
WHERE allergen_info IS NOT NULL
  AND (allergen_info->>'allergen_ids')::text != '[]'
ORDER BY variant_name;

-- 5. Check RLS policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'allergens';
