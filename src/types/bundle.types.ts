import { Tables } from "@/integrations/supabase/database.types";

export interface Bundle extends Tables<"bundles"> {
  bundle_id: string;
  bundle_name: string;
  description: string | null;
  discount_percentage: number;
  seller_id: string;
  base_price: number;
  discounted_price: number;
  created_at: string;
  status: "active" | "inactive" | "archived";
}

export interface BundleProduct extends Tables<"bundle_items"> {
  bundle_id: string;
  listing_id: string;
  quantity: number;
}

export interface BundleWithProducts extends Bundle {
  products: Tables<"seller_product_listings">[];
}