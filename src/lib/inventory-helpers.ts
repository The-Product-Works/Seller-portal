// Helper functions for inventory management

import { supabase } from "@/integrations/supabase/client";

/**
 * Calculate health score based on various factors
 */
export function calculateHealthScore(factors: {
  certificateCount: number;
  allergenCount: number;
  hasNutritionInfo: boolean;
  hasTransparencyData: boolean;
  ingredientCount?: number;
}): number {
  let score = 50; // Base score

  // Certificates (up to +20 points)
  score += Math.min(factors.certificateCount * 5, 20);

  // Fewer allergens is better (up to +15 points)
  score += Math.max(15 - factors.allergenCount * 2, 0);

  // Has nutrition info (+10 points)
  if (factors.hasNutritionInfo) score += 10;

  // Has transparency data (+10 points)
  if (factors.hasTransparencyData) score += 10;

  // Ingredient transparency (up to +5 points)
  if (factors.ingredientCount && factors.ingredientCount > 0) {
    score += Math.min(5, factors.ingredientCount);
  }

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Search global products by name
 */
export async function searchGlobalProducts(searchTerm: string) {
  const { data, error } = await supabase
    .from("global_products")
    .select("global_product_id, product_name, brand_id, brands(name)")
    .ilike("product_name", `%${searchTerm}%`)
    .eq("is_active", true)
    .limit(10);

  if (error) throw error;
  return data;
}

/**
 * Get all global products
 */
export async function getAllGlobalProducts() {
  const { data, error } = await supabase
    .from("global_products")
    .select("global_product_id, product_name, brand_id, brands(name)")
    .eq("is_active", true)
    .order("product_name", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Search brands by name
 */
export async function searchBrands(searchTerm: string) {
  const { data, error } = await supabase
    .from("brands")
    .select("brand_id, name, logo_url")
    .ilike("name", `%${searchTerm}%`)
    .eq("is_active", true)
    .limit(10);

  if (error) throw error;
  return data;
}

/**
 * Get all brands
 */
export async function getAllBrands() {
  const { data, error } = await supabase
    .from("brands")
    .select("brand_id, name, logo_url")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Create new global product
 */
export async function createGlobalProduct(
  productName: string,
  brandId: string,
  categoryId?: string
) {
  let slug = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Handle duplicate slugs by adding timestamp
  let counter = 0;
  const baseSlug = slug;
  
  while (true) {
    const { data: existing, error: checkError } = await supabase
      .from("global_products")
      .select("global_product_id")
      .eq("slug", slug)
      .maybeSingle();
    
    if (checkError) throw checkError;
    
    if (!existing) {
      break; // Slug is unique, we can use it
    }
    
    counter++;
    slug = `${baseSlug}-${Date.now()}-${counter}`;
  }

  const { data, error } = await supabase
    .from("global_products")
    .insert({
      product_name: productName,
      brand_id: brandId,
      category_id: categoryId,
      slug: slug,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create new brand
 */
export async function createBrand(brandName: string) {
  let slug = brandName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Handle duplicate brand names
  let counter = 0;
  let brandToInsert = brandName;
  
  while (true) {
    const { data: existing, error: checkError } = await supabase
      .from("brands")
      .select("brand_id")
      .eq("name", brandToInsert)
      .maybeSingle();
    
    if (checkError) throw checkError;
    
    if (!existing) {
      break; // Brand name is unique, we can use it
    }
    
    counter++;
    brandToInsert = `${brandName} (${counter})`;
    slug = brandToInsert
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const { data, error } = await supabase
    .from("brands")
    .insert({
      name: brandToInsert,
      slug: slug,
      is_active: true,
      is_verified: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all allergens
 */
export async function getAllergens() {
  const { data, error } = await supabase
    .from("allergens")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
}

/**
 * Create new allergen
 */
export async function createAllergen(name: string, description?: string) {
  const { data, error } = await supabase
    .from("allergens")
    .insert({
      name: name,
      description: description,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Upload file to storage
 * NOTE: Uses auth.uid() for path to comply with storage RLS policies
 */
export async function uploadFile(
  file: File,
  sellerId: string, // Not used for path, kept for backward compatibility
  folder: "product-images" | "certificates" | "trust-certificates"
) {
  // Get authenticated user's ID for storage path (required by RLS policies)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error("User must be authenticated to upload files");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  // Use auth.uid() instead of sellerId to match storage RLS policies
  const filePath = `${user.id}/${folder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("product")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("product").getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Get all categories
 */
export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
}

/**
 * Generate unique slug for seller product listing
 */
export async function generateUniqueSlug(text: string, sellerId: string): Promise<string> {
  // Create base slug with seller ID to ensure uniqueness across sellers
  const cleanText = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80); // Leave room for seller ID and counter
  
  // Include seller ID in the base slug for better uniqueness
  const baseSlug = `${cleanText}-${sellerId.substring(0, 8)}`;
  
  // Check if product name exists for this seller
  const { data: existingProduct, error: checkError } = await supabase
    .from("seller_product_listings")
    .select("listing_id")
    .eq("seller_id", sellerId)
    .ilike("seller_title", text)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking existing product:", checkError);
  } else if (existingProduct) {
    throw new Error("A product with this name already exists in your inventory");
  }

  // Check if slug already exists (globally)
  let slug = baseSlug;
  let counter = 1;
  
  while (counter <= 100) {
    const { data, error } = await supabase
      .from("seller_product_listings")
      .select("listing_id")
      .eq("seller_id", sellerId)  // Only check for current seller's products
      .eq("slug", slug)
      .maybeSingle(); // Use maybeSingle to avoid errors when no rows found
    
    if (error) {
      console.error("Error checking slug uniqueness:", error);
      // If there's an error, add timestamp to ensure uniqueness
      return `${baseSlug}-${Date.now()}`;
    }
    
    // If no existing record found, slug is unique
    if (!data) {
      return slug;
    }
    
    // If slug exists, try with counter
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  // Fallback: use timestamp if we've tried too many times
  return `${baseSlug}-${Date.now()}`;
}

/**
 * Generate simple slug (non-unique)
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}
