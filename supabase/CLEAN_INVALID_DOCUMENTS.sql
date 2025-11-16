-- Clean up invalid document paths in seller_documents table
-- This script will:
-- 1. Show all documents and their path formats
-- 2. Fix paths with 'seller_details/' prefix
-- 3. Delete any documents with invalid lovable.app URLs
-- 4. Show final clean state

-- Step 1: Show current state
SELECT 
    id,
    seller_id,
    doc_type,
    storage_path,
    CASE 
        WHEN storage_path LIKE 'https://%lovable.app%' THEN '❌ INVALID (lovable.app URL)'
        WHEN storage_path LIKE 'seller_details/%' THEN '⚠️ HAS PREFIX (will fix)'
        WHEN storage_path LIKE 'https://%supabase.co%' THEN '✅ VALID (Supabase signed URL)'
        WHEN storage_path LIKE '%/%/%' AND storage_path NOT LIKE 'http%' THEN '✅ VALID (storage path)'
        ELSE '❓ UNKNOWN'
    END as status,
    uploaded_at
FROM seller_documents
ORDER BY seller_id, doc_type, uploaded_at DESC;

-- Step 2: Delete documents with invalid lovable.app URLs (these were created by old uploadFile function)
DELETE FROM seller_documents 
WHERE storage_path LIKE 'https://%lovable.app%';

-- Step 3: Fix paths with seller_details/ prefix
UPDATE seller_documents 
SET storage_path = SUBSTRING(storage_path FROM 16)
WHERE storage_path LIKE 'seller_details/%' 
  AND storage_path NOT LIKE 'http%';

-- Step 4: Show final clean state - should only have valid paths
SELECT 
    seller_id,
    doc_type,
    storage_path,
    CASE 
        WHEN storage_path LIKE 'https://%supabase.co%' THEN '✅ Signed URL'
        WHEN storage_path LIKE '%/%/%' AND storage_path NOT LIKE 'http%' THEN '✅ Storage path'
        ELSE '❌ Invalid'
    END as status,
    uploaded_at
FROM seller_documents
ORDER BY seller_id, doc_type, uploaded_at DESC;

-- Step 5: Show count by seller and doc_type
SELECT 
    seller_id,
    doc_type,
    COUNT(*) as total_docs,
    MAX(uploaded_at) as latest_upload
FROM seller_documents
GROUP BY seller_id, doc_type
ORDER BY seller_id, doc_type;
