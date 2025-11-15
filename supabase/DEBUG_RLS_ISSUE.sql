-- STEP 1: Check if RLS is enabled on bundles table
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'bundles';

-- STEP 2: Check current RLS policies on bundles
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'bundles'
ORDER BY policyname;

-- STEP 3: Check if your user can see the bundle
-- Replace '84d9d4a9-731e-4109-8c3e-f2f089db04dd' with your actual auth.uid()
SELECT 
    b.bundle_id,
    b.bundle_name,
    b.seller_id,
    b.total_stock_quantity,
    s.id as seller_table_id,
    auth.uid() as current_auth_user
FROM bundles b
LEFT JOIN sellers s ON b.seller_id = s.id
WHERE b.bundle_id = '532ccbc6-91a6-4b18-a7ca-f1609939f98b';

-- STEP 4: Temporarily disable RLS to test (ONLY FOR TESTING - RE-ENABLE AFTER)
ALTER TABLE bundles DISABLE ROW LEVEL SECURITY;

-- STEP 5: After testing, RE-ENABLE RLS
-- ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
