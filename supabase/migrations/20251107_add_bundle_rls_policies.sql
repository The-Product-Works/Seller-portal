-- Enable RLS on bundles table
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

-- Sellers can insert their own bundles
CREATE POLICY "Sellers can insert their own bundles"
  ON bundles FOR INSERT
  WITH CHECK (seller_id = auth.uid());

-- Sellers can view their own bundles
CREATE POLICY "Sellers can view their own bundles"
  ON bundles FOR SELECT
  WHERE seller_id = auth.uid();

-- Sellers can update their own bundles
CREATE POLICY "Sellers can update their own bundles"
  ON bundles FOR UPDATE
  WHERE seller_id = auth.uid();

-- Sellers can delete their own bundles
CREATE POLICY "Sellers can delete their own bundles"
  ON bundles FOR DELETE
  WHERE seller_id = auth.uid();

-- Anyone can view published bundles (public bundles)
CREATE POLICY "Anyone can view published bundles"
  ON bundles FOR SELECT
  USING (status = 'active' OR status = 'active'::text);


-- Enable RLS on bundle_items table
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;

-- Sellers can insert bundle items for their own bundles
CREATE POLICY "Sellers can insert bundle items for their bundles"
  ON bundle_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bundles
      WHERE bundles.bundle_id = bundle_items.bundle_id
      AND bundles.seller_id = auth.uid()
    )
  );

-- Sellers can view bundle items for their own bundles
CREATE POLICY "Sellers can view bundle items for their bundles"
  ON bundle_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bundles
      WHERE bundles.bundle_id = bundle_items.bundle_id
      AND bundles.seller_id = auth.uid()
    )
  );

-- Sellers can update bundle items for their own bundles
CREATE POLICY "Sellers can update bundle items for their bundles"
  ON bundle_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bundles
      WHERE bundles.bundle_id = bundle_items.bundle_id
      AND bundles.seller_id = auth.uid()
    )
  );

-- Sellers can delete bundle items from their own bundles
CREATE POLICY "Sellers can delete bundle items from their bundles"
  ON bundle_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM bundles
      WHERE bundles.bundle_id = bundle_items.bundle_id
      AND bundles.seller_id = auth.uid()
    )
  );
