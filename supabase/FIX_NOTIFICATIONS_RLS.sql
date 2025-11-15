-- Fix RLS policies for notifications table to allow bundle stock updates

-- Drop existing policies that might be blocking
DROP POLICY IF EXISTS "Sellers can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Sellers can update notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;

-- Allow sellers to insert notifications (for low stock alerts)
CREATE POLICY "Sellers can insert their own notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    related_seller_id = auth.uid() OR
    sender_id = auth.uid()
  );

-- Allow sellers to update their own notifications
CREATE POLICY "Sellers can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    related_seller_id = auth.uid() OR
    receiver_id = auth.uid() OR
    sender_id = auth.uid()
  );

-- Allow sellers to view their own notifications
CREATE POLICY "Sellers can view their own notifications"
  ON notifications FOR SELECT
  USING (
    related_seller_id = auth.uid() OR
    receiver_id = auth.uid() OR
    sender_id = auth.uid()
  );

-- Allow sellers to delete their own notifications
CREATE POLICY "Sellers can delete their own notifications"
  ON notifications FOR DELETE
  USING (
    related_seller_id = auth.uid() OR
    receiver_id = auth.uid()
  );
