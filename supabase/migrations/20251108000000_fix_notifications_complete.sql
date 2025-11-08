-- CRITICAL FIX: Add related_user_id field to notifications
-- The current schema has related_seller_id -> sellers.id but RLS policies check auth.uid()
-- Solution: Add related_user_id -> auth.users.id for proper RLS enforcement
-- Keep related_seller_id for backward compatibility and business logic

-- 1. Add the new related_user_id column
ALTER TABLE public.notifications 
ADD COLUMN related_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create index for performance
CREATE INDEX idx_notifications_related_user_id ON public.notifications(related_user_id);

-- 3. Drop existing RLS policies that are incorrect
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create own notifications" ON public.notifications;

-- 4. Create CORRECT RLS policies using related_user_id
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = related_user_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = related_user_id OR auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = related_user_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = related_user_id);

CREATE POLICY "Users can delete own notifications"
    ON public.notifications FOR DELETE
    TO authenticated
    USING (auth.uid() = related_user_id OR auth.uid() = receiver_id);

-- 5. Note: related_seller_id remains unchanged for backward compatibility
-- It continues to reference sellers.id for business logic queries

COMMENT ON COLUMN public.notifications.related_user_id IS 'Stores auth.users.id for RLS policy enforcement. Use this for permission checks.';
COMMENT ON COLUMN public.notifications.related_seller_id IS 'Stores sellers.id for business logic. Use this to find which seller owns the resource.';
