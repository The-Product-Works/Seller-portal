-- Enable RLS on allergens table if not already enabled
ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to allergens" ON allergens;
DROP POLICY IF EXISTS "Allow sellers to read allergens" ON allergens;

-- Create policy to allow everyone to read allergens (it's reference data)
CREATE POLICY "Allow public read access to allergens" 
ON allergens 
FOR SELECT 
USING (true);

-- Verify the policy was created
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
