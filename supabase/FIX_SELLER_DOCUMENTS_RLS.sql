-- Ensure seller_documents table has proper RLS policies
-- This allows sellers to insert and view their own documents

-- First, check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'seller_documents';

-- Enable RLS if not already enabled
ALTER TABLE seller_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Sellers can insert their own documents" ON seller_documents;
DROP POLICY IF EXISTS "Sellers can view their own documents" ON seller_documents;
DROP POLICY IF EXISTS "Admin can view all documents" ON seller_documents;

-- Allow sellers to insert their own documents
CREATE POLICY "Sellers can insert their own documents"
ON seller_documents
FOR INSERT
TO authenticated
WITH CHECK (
  seller_id IN (
    SELECT id FROM sellers WHERE user_id = auth.uid()
  )
);

-- Allow sellers to view their own documents
CREATE POLICY "Sellers can view their own documents"
ON seller_documents
FOR SELECT
TO authenticated
USING (
  seller_id IN (
    SELECT id FROM sellers WHERE user_id = auth.uid()
  )
);

-- Allow admin to view all documents (optional - if you have admin role)
-- Uncomment if you have an admin role system
-- CREATE POLICY "Admin can view all documents"
-- ON seller_documents
-- FOR SELECT
-- TO authenticated
-- USING (
--   auth.jwt() ->> 'role' = 'admin'
-- );

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'seller_documents';
