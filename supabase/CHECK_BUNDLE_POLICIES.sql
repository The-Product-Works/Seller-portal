-- Quick check: Run this in Supabase SQL Editor to see current bundle policies
-- This will show you what RLS policies are currently active on the bundles table

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'bundles'
ORDER BY policyname;
