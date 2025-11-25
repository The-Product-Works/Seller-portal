-- Make nutrition mandatory and add mandatory image types for products

-- Add nutritional_info to products table
ALTER TABLE public.products ADD COLUMN nutritional_info jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add type column to product_images
ALTER TABLE public.product_images ADD COLUMN type text NOT NULL DEFAULT 'product' CHECK (type = ANY (ARRAY['product'::text, 'nutrition'::text, 'fssai'::text]));