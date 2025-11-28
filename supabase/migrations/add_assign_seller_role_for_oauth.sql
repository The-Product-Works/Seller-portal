-- Migration: Add function to assign seller role for OAuth signups from seller portal
-- This function handles the case where a user signs up via Google OAuth on the seller portal
-- but gets assigned a buyer role by default (due to the handle_new_buyer trigger).
-- It safely reassigns them to the seller role and creates the seller record.

-- Drop existing function if exists (for idempotency)
DROP FUNCTION IF EXISTS public.assign_seller_role_for_oauth(UUID);

-- Create the improved function with safety checks
CREATE OR REPLACE FUNCTION public.assign_seller_role_for_oauth(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_role_id UUID;
  seller_role_id UUID;
BEGIN
  -- Get buyer role id (may be null if role doesn't exist)
  SELECT role_id INTO buyer_role_id 
  FROM public.roles 
  WHERE role_name = 'buyer' 
  LIMIT 1;

  -- Ensure seller role exists (safe for concurrency with ON CONFLICT)
  INSERT INTO public.roles (role_name)
  VALUES ('seller')
  ON CONFLICT (role_name) DO NOTHING;

  -- Now fetch seller_role_id (must exist after INSERT ON CONFLICT)
  SELECT role_id INTO seller_role_id 
  FROM public.roles 
  WHERE role_name = 'seller' 
  LIMIT 1;

  -- Delete buyer role assignment only if buyer role exists
  IF buyer_role_id IS NOT NULL THEN
    DELETE FROM public.user_roles
    WHERE user_id = p_user_id AND role_id = buyer_role_id;
  END IF;

  -- Ensure seller role assignment (ON CONFLICT handles if already has seller role)
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (p_user_id, seller_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- Create seller record if not exists, copying email from auth.users
  INSERT INTO public.sellers (user_id, email, is_individual, onboarding_status, created_at)
  SELECT
    p_user_id,
    u.email,
    true,
    'started',
    now()
  FROM auth.users u
  WHERE u.id = p_user_id
  ON CONFLICT (user_id) DO NOTHING;

  RETURN;
END;
$$;

-- Grant execute permission to authenticated users
-- This allows users to call this function after OAuth callback
-- If you want to restrict this to only server-side calls, remove this grant
-- and use service_role key instead
GRANT EXECUTE ON FUNCTION public.assign_seller_role_for_oauth(UUID) TO authenticated;

-- Add a comment to document the function purpose
COMMENT ON FUNCTION public.assign_seller_role_for_oauth(UUID) IS 
'Assigns seller role to a user who signed up via OAuth on the seller portal. 
Removes buyer role if present, adds seller role, and creates seller record.
Called from frontend after OAuth callback when seller_signup_pending flag is set.';
