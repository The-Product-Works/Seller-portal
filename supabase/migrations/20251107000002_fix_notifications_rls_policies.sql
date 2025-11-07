-- Fix RLS policies for notifications table to use related_seller_id instead of seller_id
-- This is needed because the earlier migration changed the column name from seller_id to related_seller_id

-- Drop old policies that reference seller_id
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- Create new policies that use related_seller_id
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = related_seller_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = related_seller_id);

-- Add INSERT policy for creating notifications
CREATE POLICY "Users can create own notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = related_seller_id);
