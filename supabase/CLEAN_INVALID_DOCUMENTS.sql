-- Clean up invalid document paths in seller_documents table
-- This script will:
-- 1. Show all documents and their path formats
-- 2. Delete ALL old documents (they will be re-uploaded with correct signed URLs)
-- 3. Show final clean state

-- Step 1: Show current state
SELECT 
    id,
    seller_id,
    doc_type,
    storage_path,
    CASE 
        WHEN storage_path LIKE 'https://%lovable.app%' THEN '❌ INVALID (lovable.app URL)'
        WHEN storage_path LIKE 'seller_details/%' THEN '❌ INVALID (has prefix)'
        WHEN storage_path LIKE '%/%/%' AND storage_path NOT LIKE 'http%' THEN '❌ INVALID (storage path, need signed URL)'
        WHEN storage_path LIKE 'https://%supabase.co%' THEN '✅ VALID (Supabase signed URL)'
        ELSE '❓ UNKNOWN'
    END as status,
    uploaded_at
FROM seller_documents
ORDER BY seller_id, doc_type, uploaded_at DESC;

-- Step 2: Delete ALL existing documents (they need to be re-uploaded with signed URLs)
-- This ensures a clean slate for the new upload system
DELETE FROM seller_documents;

-- Step 3: Verify the table is empty
SELECT COUNT(*) as remaining_documents FROM seller_documents;
