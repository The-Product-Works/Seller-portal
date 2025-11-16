-- Fix storage paths in seller_documents table
-- This removes the 'seller_details/' prefix from any paths that have it
-- Run this in Supabase SQL Editor

-- First, check what needs to be fixed
SELECT 
    id,
    seller_id,
    doc_type,
    storage_path as old_path,
    CASE 
        WHEN storage_path LIKE 'seller_details/%' 
        THEN SUBSTRING(storage_path FROM 16)  -- Remove 'seller_details/' (15 chars)
        ELSE storage_path 
    END as new_path
FROM seller_documents
WHERE storage_path LIKE 'seller_details/%'
ORDER BY uploaded_at DESC;

-- If the above shows documents that need fixing, run this UPDATE:
UPDATE seller_documents 
SET storage_path = SUBSTRING(storage_path FROM 16)
WHERE storage_path LIKE 'seller_details/%' 
  AND storage_path NOT LIKE 'http%';

-- Verify the fix
SELECT 
    seller_id,
    doc_type,
    storage_path,
    uploaded_at
FROM seller_documents
ORDER BY seller_id, uploaded_at DESC;
