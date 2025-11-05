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
  const slug = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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
  const slug = brandName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const { data, error } = await supabase
    .from("brands")
    .insert({
      name: brandName,
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
 */
export async function uploadFile(
  file: File,
  sellerId: string,
  folder: "product-images" | "certificates" | "trust-certificates"
) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${sellerId}/${folder}/${fileName}`;

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
 * Generate unique slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}
