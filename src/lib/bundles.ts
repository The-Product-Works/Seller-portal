import { supabase } from "@/integrations/supabase/client";
import { BundleWithProducts } from "@/types/bundle.types";
import { Tables } from "@/integrations/supabase/database.types";

export type CreateBundleInput = {
  name: string;
  description?: string;
  discount_percentage: number;
  seller_id: string;
  products: {
    product_id: string;
    quantity: number;
  }[];
};

export type UpdateBundleInput = {
  name?: string;
  description?: string;
  discount_percentage?: number;
  products?: {
    product_id: string;
    quantity: number;
  }[];
};

export async function createBundle(input: CreateBundleInput): Promise<BundleWithProducts | null> {
  try {
    // Start a transaction
    const { data: bundle, error: bundleError } = await supabase
      .from("bundles")
      .insert({
        bundle_name: input.name,
        description: input.description,
        discount_percentage: input.discount_percentage,
        seller_id: input.seller_id,
        // These will be calculated by the trigger
        base_price: 0,
        discounted_price: 0,
      })
      .select()
      .single();

    if (bundleError) throw bundleError;

    // Insert bundle products
    const bundleProducts = input.products.map(product => ({
      bundle_id: bundle.bundle_id,
      listing_id: product.product_id,  // Note: using listing_id as per database schema
      quantity: product.quantity
    }));

    const { error: productsError } = await supabase
      .from("bundle_items")
      .insert(bundleProducts);

    if (productsError) throw productsError;

    // Fetch the complete bundle with products
    return getBundleById(bundle.bundle_id);

  } catch (error) {
    console.error("Error creating bundle:", error);
    return null;
  }
}

export async function getBundleById(bundleId: string): Promise<BundleWithProducts | null> {
  try {
    // Get the bundle
    const { data: bundle, error: bundleError } = await supabase
      .from("bundles")
      .select("*")
      .eq("bundle_id", bundleId)
      .single();

    if (bundleError) throw bundleError;

    // Get all products in the bundle
    const { data: bundleProducts, error: productsError } = await supabase
      .from("bundle_items")
      .select(`
        listing_id,
        quantity,
        seller_product_listings (*)
      `)
      .eq("bundle_id", bundleId);

    if (productsError) throw productsError;

    const products = bundleProducts?.map(bp => bp.seller_product_listings) || [];

    return {
      ...bundle,
      products
    } as BundleWithProducts;

  } catch (error) {
    console.error("Error fetching bundle:", error);
    return null;
  }
}

export async function updateBundle(bundleId: string, input: UpdateBundleInput): Promise<BundleWithProducts | null> {
  try {
    // Start with updating the bundle details
    const { error: bundleError } = await supabase
      .from("bundles")
      .update({
        bundle_name: input.name,
        description: input.description,
        discount_percentage: input.discount_percentage,
      })
      .eq("bundle_id", bundleId);

    if (bundleError) throw bundleError;

    // If products are being updated
    if (input.products) {
      // First delete all existing bundle products
      const { error: deleteError } = await supabase
        .from("bundle_items")
        .delete()
        .eq("bundle_id", bundleId);

      if (deleteError) throw deleteError;

      // Then insert new bundle products
      const bundleProducts = input.products.map(product => ({
        bundle_id: bundleId,
        listing_id: product.product_id,
        quantity: product.quantity
      }));

      const { error: productsError } = await supabase
        .from("bundle_items")
        .insert(bundleProducts);

      if (productsError) throw productsError;
    }

    // Return the updated bundle
    return getBundleById(bundleId);

  } catch (error) {
    console.error("Error updating bundle:", error);
    return null;
  }
}

export async function deleteBundle(bundleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("bundles")
      .delete()
      .eq("bundle_id", bundleId);

    return !error;
  } catch (error) {
    console.error("Error deleting bundle:", error);
    return false;
  }
}

export async function listBundles(sellerId?: string): Promise<BundleWithProducts[]> {
  try {
    let query = supabase
      .from("bundles")
      .select(`
        *,
        bundle_items (
          listing_id,
          quantity,
          seller_product_listings (*)
        )
      `);

    if (sellerId) {
      query = query.eq("seller_id", sellerId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.map(bundle => ({
      ...bundle,
      products: bundle.bundle_items?.map((bp: any) => bp.seller_product_listings) || []
    })) as BundleWithProducts[] || [];

  } catch (error) {
    console.error("Error listing bundles:", error);
    return [];
  }
}