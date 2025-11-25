-- Add total_stock_quantity to bundles table to track how many bundles can be sold
ALTER TABLE bundles 
ADD COLUMN IF NOT EXISTS total_stock_quantity INTEGER DEFAULT 0 CHECK (total_stock_quantity >= 0);
