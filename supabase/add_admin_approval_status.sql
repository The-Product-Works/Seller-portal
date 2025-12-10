-- Migration: Add Admin Approval Status to Product Listings
-- Date: December 10, 2025
-- Description: Adds pending_approval and failed_approval statuses to seller_product_listings
-- This enables admin review workflow before products go live on buyer portal

-- Step 1: Drop existing check constraint on status
ALTER TABLE public.seller_product_listings 
DROP CONSTRAINT IF EXISTS seller_product_listings_status_check;

-- Step 2: Add new check constraint with additional status values
ALTER TABLE public.seller_product_listings 
ADD CONSTRAINT seller_product_listings_status_check 
CHECK (status::text = ANY (ARRAY[
  'draft'::character varying::text, 
  'active'::character varying::text, 
  'inactive'::character varying::text, 
  'suspended'::character varying::text,
  'pending_approval'::character varying::text,
  'failed_approval'::character varying::text
]));

-- Step 3: Ensure verification_notes column exists (already in schema, but adding comment)
COMMENT ON COLUMN public.seller_product_listings.verification_notes IS 
'Admin notes for product verification. Used to communicate approval/rejection reasons to sellers.';

-- Step 4: Create index for faster filtering by status (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_seller_product_listings_status 
ON public.seller_product_listings(status);

-- Step 5: Create index for pending approvals (admin portal optimization)
CREATE INDEX IF NOT EXISTS idx_seller_product_listings_pending 
ON public.seller_product_listings(status, created_at) 
WHERE status = 'pending_approval';

-- Step 6: Add helpful comment on status column
COMMENT ON COLUMN public.seller_product_listings.status IS 
'Product listing status: 
- draft: Not submitted for review
- pending_approval: Submitted by seller, awaiting admin review
- active: Approved by admin, visible on buyer portal
- failed_approval: Rejected by admin, see verification_notes
- inactive: Deactivated by seller
- suspended: Suspended by admin';

-- Step 7: Update any existing 'active' products to 'pending_approval' if needed
-- (Uncomment only if you want to reset all active products for re-review)
-- UPDATE public.seller_product_listings 
-- SET status = 'pending_approval', 
--     verification_notes = 'Migrated from active status. Requires admin re-approval.'
-- WHERE status = 'active';

-- Migration complete
-- Note: Buyer portal should filter products WHERE status = 'active'
-- Note: Admin portal should show products WHERE status = 'pending_approval' for review
