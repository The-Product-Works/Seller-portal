-- Fix RLS policies for bundles table to work with sellers table relationship
-- The issue: bundles.seller_id references sellers.id, not auth.uid() directly

-- Drop existing policies
DROP POLICY IF EXISTS "Sellers can insert their own bundles" ON bundles;
DROP POLICY IF EXISTS "Sellers can view their own bundles" ON bundles;
DROP POLICY IF EXISTS "Sellers can update their own bundles" ON bundles;
DROP POLICY IF EXISTS "Sellers can delete their own bundles" ON bundles;
DROP POLICY IF EXISTS "Anyone can view published bundles" ON bundles;

-- Recreate policies with correct auth check through sellers table
CREATE POLICY "Sellers can insert their own bundles"
  ON bundles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sellers 
      WHERE sellers.id = bundles.seller_id 
      AND sellers.id = auth.uid()
    )
  );

CREATE POLICY "Sellers can view their own bundles"
  ON bundles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sellers 
      WHERE sellers.id = bundles.seller_id 
      AND sellers.id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update their own bundles"
  ON bundles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sellers 
      WHERE sellers.id = bundles.seller_id 
      AND sellers.id = auth.uid()
    )
  );

CREATE POLICY "Sellers can delete their own bundles"
  ON bundles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sellers 
      WHERE sellers.id = bundles.seller_id 
      AND sellers.id = auth.uid()
    )
  );

-- Anyone can view active bundles
CREATE POLICY "Anyone can view active bundles"
  ON bundles FOR SELECT
  USING (status = 'active');
