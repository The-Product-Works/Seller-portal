-- Test allergen query to verify data exists and RLS works

-- 1. Simple count
SELECT COUNT(*) as total_allergens FROM allergens;

-- 2. List all with IDs (same as frontend query)
SELECT allergen_id, name, description 
FROM allergens 
ORDER BY name;

-- 3. Check specific IDs used in chocos variant
SELECT * FROM allergens 
WHERE allergen_id IN (
  '73301aa4-b893-45f4-8fea-7fc3429461c0',
  'ebebf703-35a3-4c87-9c82-357f0ddfa1be',
  '75b39690-791a-4405-b992-411a92549900'
);
