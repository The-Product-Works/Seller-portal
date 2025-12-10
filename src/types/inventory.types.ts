// Type definitions for inventory management

import type { Json } from "@/integrations/supabase/database.types";

export interface VariantForm {
  variant_id?: string;
  sku: string;
  variant_name: string;
  size: string;
  flavor?: string;
  serving_count?: number;
  price: number;
  original_price: number;
  stock_quantity: number;
  manufacture_date?: string;
  batch_number?: string;
  expiry_date?: string;
  nutritional_info?: Record<string, string | number | boolean | null>;
  is_available: boolean;
  
  // P0 Mandatory Fields
  product_image_url?: string;
  ingredient_image_url?: string;
  nutrient_table_image_url?: string;
  fssai_label_image_url?: string;
  ingredient_list?: Json | string; // Can be JSON from DB or string from form
  allergen_info?: Json | string; // Can be JSON from DB or string from form
  fssai_number?: string;
  fssai_expiry_date?: string;
  nutrient_breakdown?: Record<string, unknown>;
  accuracy_attested?: boolean;
  attested_by?: string;
  attested_at?: string;
  
  // P0 Image Files (for upload)
  productImageFile?: File | null;
  ingredientImageFile?: File | null;
  nutrientImageFile?: File | null;
  fssaiImageFile?: File | null;
}

export interface ProductForm {
  listing_id?: string;
  global_product_id?: string;
  global_product_name?: string;
  brand_id?: string;
  brand_name?: string;
  category_id?: string;
  seller_title: string;
  seller_description: string;
  seller_ingredients?: string;
  allergen_ids: string[];
  health_score?: number;
  shelf_life_months?: number;
  return_policy?: string;
  shipping_info?: string;
  status: "draft" | "active" | "inactive";
  variants: VariantForm[];
  certificate_urls: string[];
  trust_certificate_urls: string[];
  product_images: string[];
  transparency_data?: TransparencyForm;
}

export interface TransparencyForm {
  clinical_data?: string;
  ingredient_source?: string;
  manufacturing_info?: string;
  testing_info?: string;
  quality_assurance?: string;
  third_party_tested: boolean;
  testing_lab?: string;
  test_date?: string;
  test_report_url?: string;
  test_report_number?: string;
  certifications_summary?: string;
  sustainability_info?: string;
  ethical_sourcing?: string;
}

export interface FilterOptions {
  searchTerm: string;
  searchType: "name" | "brand" | "variant";
  priceRange?: { min: number; max: number };
  discountRange?: { min: number; max: number };
  stockRange?: { min: number; max: number };
  status?: "draft" | "active" | "inactive";
}

export interface ListingWithDetails {
  listing_id: string;
  global_product_id: string;
  seller_id: string;
  seller_title: string;
  seller_description: string;
  seller_ingredients?: string;
  health_score?: number;
  base_price: number;
  discounted_price?: number;
  discount_percentage?: number;
  return_days?: number;
  total_stock_quantity: number;
  shelf_life_months?: number;
  return_policy?: string;
  shipping_info?: string;
  rating?: number;
  review_count: number;
  status: string;
  is_verified: boolean;
  slug: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  itemType?: 'listing';
  global_products?: {
    product_name: string;
    brand_id: string;
    brands?: {
      name: string;
      logo_url?: string;
    };
  };
  listing_variants?: VariantForm[];
  listing_images?: Array<{
    image_id: string;
    image_url: string;
    is_primary: boolean;
    variant_id?: string;
  }>;
}

export interface BundleWithDetails {
  bundle_id: string;
  seller_id: string;
  bundle_name: string;
  description?: string;
  base_price: number;
  discounted_price?: number;
  discount_percentage?: number;
  total_items: number;
  total_stock_quantity: number;
  status: 'draft' | 'active';
  published_at?: string;
  slug: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  itemType: 'bundle';
  [key: string]: unknown;
}
