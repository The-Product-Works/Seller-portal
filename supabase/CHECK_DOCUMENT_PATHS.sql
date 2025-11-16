-- Check what format the storage_path is currently saved in
-- Run this in Supabase SQL Editor to see the current state

SELECT 
    id,
    seller_id,
    doc_type,
    storage_path,
    CASE 
        WHEN storage_path LIKE 'seller_details/%' THEN 'HAS PREFIX (WRONG)'
        WHEN storage_path LIKE 'http%' THEN 'SIGNED URL'
        ELSE 'NO PREFIX (CORRECT)'
    END as path_format,
    uploaded_at
FROM seller_documents
ORDER BY seller_id, doc_type, uploaded_at DESC;

-- If you see "HAS PREFIX (WRONG)", run this to fix:
-- UPDATE seller_documents 
-- SET storage_path = SUBSTRING(storage_path FROM 16)  -- removes 'seller_details/' (15 chars + 1)
-- WHERE storage_path LIKE 'seller_details/%';
