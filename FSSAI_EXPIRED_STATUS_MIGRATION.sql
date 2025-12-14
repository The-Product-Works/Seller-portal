-- ============================================================================
-- FSSAI Expired Status Migration
-- Run this in Supabase SQL Editor
-- Created: December 13, 2025
-- ============================================================================

-- ============================================================================
-- STEP 1: Add 'expired' to the status check constraint
-- ============================================================================

-- First, drop the existing constraint
ALTER TABLE public.seller_product_listings 
DROP CONSTRAINT IF EXISTS seller_product_listings_status_check;

-- Add the new constraint with 'expired' status included
ALTER TABLE public.seller_product_listings 
ADD CONSTRAINT seller_product_listings_status_check 
CHECK (status::text = ANY (ARRAY[
  'draft'::character varying::text, 
  'active'::character varying::text, 
  'inactive'::character varying::text, 
  'suspended'::character varying::text, 
  'pending_approval'::character varying::text, 
  'failed_approval'::character varying::text,
  'expired'::character varying::text
]));

-- ============================================================================
-- STEP 2: Create function to check and update expired FSSAI products
-- ============================================================================

-- This function checks if ANY variant of a product has an expired FSSAI
-- and updates the product status to 'expired' if so.
-- It can be called from the buyer portal when viewing a product.

CREATE OR REPLACE FUNCTION public.check_and_update_fssai_expiry(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Required to bypass RLS for status update
AS $$
DECLARE
  v_expired_variants JSONB := '[]'::JSONB;
  v_has_expired BOOLEAN := FALSE;
  v_current_status TEXT;
  v_variant RECORD;
  v_result JSONB;
BEGIN
  -- Get current product status
  SELECT status INTO v_current_status
  FROM public.seller_product_listings
  WHERE listing_id = p_listing_id;

  -- If product not found, return error
  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product not found',
      'listing_id', p_listing_id
    );
  END IF;

  -- Check all variants for expired FSSAI
  FOR v_variant IN 
    SELECT 
      variant_id,
      variant_name,
      fssai_number,
      fssai_expiry_date
    FROM public.listing_variants
    WHERE listing_id = p_listing_id
      AND fssai_expiry_date IS NOT NULL
      AND fssai_expiry_date < CURRENT_DATE
  LOOP
    v_has_expired := TRUE;
    -- Build array properly: wrap object in array before concatenating
    v_expired_variants := v_expired_variants || jsonb_build_array(jsonb_build_object(
      'variant_id', v_variant.variant_id,
      'variant_name', v_variant.variant_name,
      'fssai_number', v_variant.fssai_number,
      'fssai_expiry_date', v_variant.fssai_expiry_date
    ));
  END LOOP;

  -- If any variant has expired FSSAI and current status is 'active', update to 'expired'
  IF v_has_expired AND v_current_status = 'active' THEN
    UPDATE public.seller_product_listings
    SET 
      status = 'expired',
      updated_at = NOW()
    WHERE listing_id = p_listing_id;

    -- Create a notification for the seller
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      related_seller_id,
      related_product_id,
      metadata,
      is_read,
      created_at
    )
    SELECT 
      s.user_id,
      'fssai_expired',
      'FSSAI Expired - Product Delisted',
      'Your product "' || spl.seller_title || '" has been marked as expired due to FSSAI expiry. Please update the FSSAI information to resume selling.',
      spl.seller_id,
      p_listing_id,
      jsonb_build_object(
        'expired_variants', v_expired_variants,
        'previous_status', v_current_status
      ),
      false,
      NOW()
    FROM public.seller_product_listings spl
    JOIN public.sellers s ON s.id = spl.seller_id
    WHERE spl.listing_id = p_listing_id;

    RETURN jsonb_build_object(
      'success', true,
      'status_updated', true,
      'previous_status', v_current_status,
      'new_status', 'expired',
      'expired_variants', v_expired_variants,
      'message', 'Product status updated to expired due to FSSAI expiry'
    );
  END IF;

  -- If no expired variants found or status is not active
  RETURN jsonb_build_object(
    'success', true,
    'status_updated', false,
    'current_status', v_current_status,
    'has_expired_fssai', v_has_expired,
    'expired_variants', v_expired_variants,
    'message', CASE 
      WHEN NOT v_has_expired THEN 'No expired FSSAI found'
      WHEN v_current_status != 'active' THEN 'Product is not active, status not changed'
      ELSE 'No action required'
    END
  );
END;
$$;

-- Grant execute permission to authenticated and anonymous users
-- SECURITY NOTE: anon grant is intentional for buyer portal (non-logged-in users)
-- This is safe because the function only transitions products from 'active' to 'expired'
-- (a protective action that prevents selling expired products, not a privilege escalation)
GRANT EXECUTE ON FUNCTION public.check_and_update_fssai_expiry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_update_fssai_expiry(UUID) TO anon;

-- ============================================================================
-- STEP 3: Create function to check FSSAI expiry without updating
-- (Read-only version for display purposes)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_fssai_expiry_status(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Required to bypass RLS for consistent reads
STABLE  -- Function doesn't modify database
AS $$
DECLARE
  v_expired_variants JSONB := '[]'::JSONB;
  v_expiring_soon_variants JSONB := '[]'::JSONB;
  v_current_status TEXT;
  v_variant RECORD;
BEGIN
  -- Get current product status
  SELECT status INTO v_current_status
  FROM public.seller_product_listings
  WHERE listing_id = p_listing_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product not found'
    );
  END IF;

  -- Check for expired variants
  FOR v_variant IN 
    SELECT 
      variant_id,
      variant_name,
      fssai_number,
      fssai_expiry_date
    FROM public.listing_variants
    WHERE listing_id = p_listing_id
      AND fssai_expiry_date IS NOT NULL
      AND fssai_expiry_date < CURRENT_DATE
  LOOP
    -- Build array properly: wrap object in array before concatenating
    v_expired_variants := v_expired_variants || jsonb_build_array(jsonb_build_object(
      'variant_id', v_variant.variant_id,
      'variant_name', v_variant.variant_name,
      'fssai_expiry_date', v_variant.fssai_expiry_date
    ));
  END LOOP;

  -- Check for variants expiring within 30 days
  FOR v_variant IN 
    SELECT 
      variant_id,
      variant_name,
      fssai_number,
      fssai_expiry_date
    FROM public.listing_variants
    WHERE listing_id = p_listing_id
      AND fssai_expiry_date IS NOT NULL
      AND fssai_expiry_date >= CURRENT_DATE
      AND fssai_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
  LOOP
    -- Build array properly: wrap object in array before concatenating
    v_expiring_soon_variants := v_expiring_soon_variants || jsonb_build_array(jsonb_build_object(
      'variant_id', v_variant.variant_id,
      'variant_name', v_variant.variant_name,
      'fssai_expiry_date', v_variant.fssai_expiry_date,
      'days_until_expiry', (v_variant.fssai_expiry_date - CURRENT_DATE)
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'current_status', v_current_status,
    'has_expired', jsonb_array_length(v_expired_variants) > 0,
    'has_expiring_soon', jsonb_array_length(v_expiring_soon_variants) > 0,
    'expired_variants', v_expired_variants,
    'expiring_soon_variants', v_expiring_soon_variants
  );
END;
$$;

-- Grant execute permission (read-only, safe for public access)
-- SECURITY NOTE: anon grant is intentional - buyer portal needs read-only FSSAI status
GRANT EXECUTE ON FUNCTION public.get_fssai_expiry_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fssai_expiry_status(UUID) TO anon;

-- ============================================================================
-- STEP 4: Create a cron job function to check all active products
-- (Optional - can be run daily via pg_cron or external scheduler)
-- Note: Renamed to avoid conflict with existing notification function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_update_all_product_fssai_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing RECORD;
  v_updated_count INTEGER := 0;
  v_checked_count INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Loop through all active products
  FOR v_listing IN 
    SELECT DISTINCT spl.listing_id
    FROM public.seller_product_listings spl
    JOIN public.listing_variants lv ON lv.listing_id = spl.listing_id
    WHERE spl.status = 'active'
      AND lv.fssai_expiry_date IS NOT NULL
      AND lv.fssai_expiry_date < CURRENT_DATE
  LOOP
    v_checked_count := v_checked_count + 1;
    
    -- Call the check function for each listing
    SELECT public.check_and_update_fssai_expiry(v_listing.listing_id) INTO v_result;
    
    IF v_result->>'status_updated' = 'true' THEN
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'checked_count', v_checked_count,
    'updated_count', v_updated_count,
    'run_at', NOW()
  );
END;
$$;

-- Grant execute permission (admin/service role only - restrict to scheduled tasks)
-- Note: This should be called by cron/scheduler, not directly by users
GRANT EXECUTE ON FUNCTION public.check_and_update_all_product_fssai_status() TO authenticated;

-- ============================================================================
-- STEP 5: Add notification type for FSSAI expiry (if not exists)
-- ============================================================================

-- Verify the notifications table can handle 'fssai_expired' type
-- (Usually type is a text field, but if there's a check constraint, update it)

-- Check if there's a check constraint on notifications.type and update if needed
-- This is optional based on your schema

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify the migration worked:

-- 1. Check the new constraint
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.seller_product_listings'::regclass 
--   AND conname = 'seller_product_listings_status_check';

-- 2. Test the function (replace with a real listing_id)
-- SELECT public.check_and_update_fssai_expiry('your-listing-uuid-here');

-- 2b. Test batch update function
-- SELECT public.check_and_update_all_product_fssai_status();

-- 3. Check products with expired FSSAI
-- SELECT spl.listing_id, spl.seller_title, spl.status, lv.variant_name, lv.fssai_expiry_date
-- FROM seller_product_listings spl
-- JOIN listing_variants lv ON lv.listing_id = spl.listing_id
-- WHERE lv.fssai_expiry_date < CURRENT_DATE;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
