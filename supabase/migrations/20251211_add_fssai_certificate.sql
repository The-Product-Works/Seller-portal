-- Add FSSAI certificate document URL to sellers table
-- This will store the signed URL to the FSSAI certificate (PDF or image)

ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS fssai_certificate_url TEXT;

COMMENT ON COLUMN sellers.fssai_certificate_url IS 'Signed URL to FSSAI certificate document (PDF or image) stored in seller_details bucket';

-- Update seller_documents table doc_type enum to include 'fssai_certificate'
-- Note: This assumes doc_type is a text field. If it's an enum, you'll need to alter the enum type
-- Check current doc_type constraint
DO $$
BEGIN
  -- If doc_type has a CHECK constraint, we need to drop and recreate it
  -- Check if constraint exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.constraint_column_usage 
    WHERE table_name = 'seller_documents' 
    AND column_name = 'doc_type'
  ) THEN
    -- Drop existing constraint
    ALTER TABLE seller_documents 
    DROP CONSTRAINT IF EXISTS seller_documents_doc_type_check;
  END IF;

  -- Add new constraint including 'fssai_certificate'
  ALTER TABLE seller_documents 
  ADD CONSTRAINT seller_documents_doc_type_check 
  CHECK (doc_type IN ('selfie', 'aadhaar', 'pan', 'gstin', 'fssai_certificate'));
END $$;

COMMENT ON COLUMN seller_documents.doc_type IS 'Type of document: selfie, aadhaar, pan, gstin, or fssai_certificate';
