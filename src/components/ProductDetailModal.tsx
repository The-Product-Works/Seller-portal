import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Package, AlertTriangle, X } from "lucide-react";

interface ListingImage {
  image_url: string;
  is_primary?: boolean;
}

interface BrandInfo {
  name?: string;
}

interface GlobalProduct {
  product_name?: string;
  description?: string;
  allergens?: string[];
  brands?: BrandInfo;
}

interface ProductDetail {
  [key: string]: unknown;
  seller_title?: string;
  description?: string;
  global_products?: GlobalProduct;
}

interface ProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  bundleId?: string;
}

export function ProductDetailModal({
  open,
  onOpenChange,
  productId,
  bundleId,
}: ProductDetailModalProps) {
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [bundle, setBundle] = useState<Record<string, unknown> | null>(null);
  const [bundleItems, setBundleItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "allergens" | "transparency">("overview");
  const [allImages, setAllImages] = useState<ListingImage[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  useEffect(() => {
    if (open && productId) {
      console.log("Loading product with ID:", productId);
      loadProduct();
    } else if (open && bundleId) {
      console.log("Loading bundle with ID:", bundleId);
      loadBundle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId, bundleId]);

  const loadProduct = async () => {
    setLoading(true);
    console.log("loadProduct called with productId:", productId);
    try {
      const { data, error } = await supabase
        .from("seller_product_listings")
        .select(
          `
          *,
          global_products (
            product_name,
            brands (name)
          ),
          listing_images (image_url, is_primary),
          listing_variants (
            variant_id,
            variant_name,
            sku,
            size,
            flavor,
            price,
            original_price,
            stock_quantity,
            product_image_url,
            ingredient_image_url,
            nutrient_table_image_url,
            fssai_label_image_url,
            ingredient_list,
            allergen_info,
            fssai_number,
            fssai_expiry_date,
            nutrient_breakdown,
            nutritional_info,
            accuracy_attested,
            attested_by,
            attested_at,
            expiry_date,
            manufacture_date,
            batch_number,
            is_p0_compliant
          )
        `
        )
        .eq("listing_id", productId)
        .single();

      if (error) {
        console.error("Query error:", error);
        throw error;
      }
      
      console.log("Product data loaded:", data);
      setProduct(data);
      setAllImages(data.listing_images || []);
      if (data.listing_images && data.listing_images.length > 0) {
        setSelectedImage(0);
      }
      // Set first variant as selected by default
      if (data.listing_variants && data.listing_variants.length > 0) {
        setSelectedVariantId(data.listing_variants[0].variant_id);
      }
    } catch (error) {
      console.error("Error loading product:", error);
      alert(`Failed to load product details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadBundle = async () => {
    setLoading(true);
    try {
      const { data: bundleData, error: bundleError } = await supabase
        .from("bundles")
        .select("*")
        .eq("bundle_id", bundleId)
        .single();

      if (bundleError) throw bundleError;
      setBundle(bundleData);

      // Load bundle items
      const { data: itemsData, error: itemsError } = await supabase
        .from("bundle_items")
        .select(
          `
          *,
          seller_product_listings (
            *,
            global_products (
              product_name,
              description,
              brands (name),
              allergens
            ),
            listing_images (image_url, is_primary)
          )
        `
        )
        .eq("bundle_id", bundleId);

      if (itemsError) throw itemsError;
      setBundleItems(itemsData || []);
    } catch (error) {
      console.error("Error loading bundle:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (variantId: string, newStock: number) => {
    try {
      const { error } = await supabase
        .from("listing_variants")
        .update({ stock_quantity: newStock })
        .eq("variant_id", variantId);

      if (error) throw error;

      alert(`Stock updated successfully to ${newStock} units!`);
      // Reload product to show updated stock
      if (productId) loadProduct();
    } catch (error) {
      console.error("Error updating stock:", error);
      alert(`Failed to update stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    try {
      const { error } = await supabase
        .from("listing_variants")
        .delete()
        .eq("variant_id", variantId);

      if (error) throw error;

      alert("Variant deleted successfully!");
      // Reload product to show remaining variants
      if (productId) loadProduct();
    } catch (error) {
      console.error("Error deleting variant:", error);
      alert(`Failed to delete variant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const renderProductContent = () => {
    if (!product) return null;

    const p = product as ProductDetail;
    const variants = (p.listing_variants as Array<Record<string, unknown>>) || [];
    const selectedVariant = selectedVariantId ? variants.find(v => v.variant_id === selectedVariantId) : variants[0];
    
    // Use selected variant's product image if available, otherwise use listing images
    const variantImage = selectedVariant?.product_image_url as string | undefined;
    const primaryImage = variantImage ? { image_url: variantImage, is_primary: true } : (allImages?.find((img) => img.is_primary) || allImages?.[selectedImage]);
    
    const globalProducts = p.global_products as GlobalProduct | undefined;
    const brandName = globalProducts?.brands?.name || "Unknown Brand";
    const productName = (p.seller_title as string) || globalProducts?.product_name || "Untitled";
    const description = (p.seller_description as string) || "No description available";
    // Allergens are now per-variant in allergen_info field
    const allergens: string[] = [];
    
    // Use variant price directly, or base price if no variant selected
    const variantPrice = selectedVariant ? 
      (selectedVariant.price as number || 0) : 
      (p.base_price as number || 0);

    return (
      <div className="space-y-6">
        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="w-full bg-muted rounded-lg overflow-hidden">
            {primaryImage?.image_url ? (
              <img
                src={primaryImage.image_url}
                alt={productName}
                className="w-full h-96 object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-96 bg-muted">
                <Package className="h-24 w-24 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Variant Selector - Circular Images */}
          {variants && variants.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-sm font-semibold mb-2">Select Variant:</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {variants.map((variant) => {
                  const isSelected = selectedVariantId === variant.variant_id;
                  return (
                    <button
                      key={variant.variant_id as string}
                      onClick={() => setSelectedVariantId(variant.variant_id as string)}
                      className={`flex-shrink-0 flex flex-col items-center gap-1 transition-all ${
                        isSelected ? 'opacity-100' : 'opacity-60 hover:opacity-90'
                      }`}
                    >
                      <div className={`w-16 h-16 rounded-full border-3 overflow-hidden ${
                        isSelected ? 'border-primary ring-2 ring-primary' : 'border-muted'
                      }`}>
                        {variant.product_image_url ? (
                          <img 
                            src={variant.product_image_url as string} 
                            alt={variant.variant_name as string}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-center max-w-[70px] truncate">
                        {variant.variant_name as string}
                      </p>
                      {isSelected && variant.is_p0_compliant && (
                        <Badge variant="default" className="text-[10px] bg-green-600 px-1 py-0">P0</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {allImages && allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden transition-all ${
                    selectedImage === idx ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={img.image_url} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b overflow-x-auto">
          {["overview", "details", "allergens", "transparency"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as "overview" | "details" | "allergens" | "transparency")}
              className={`pb-2 px-3 font-medium text-sm whitespace-nowrap capitalize ${
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{brandName}</p>
              <h2 className="text-2xl font-bold">{productName}</h2>
            </div>

            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl font-bold">₹{variantPrice}</span>
              {selectedVariant && selectedVariant.original_price && variantPrice !== selectedVariant.original_price && (
                <span className="text-sm text-muted-foreground line-through">(MRP: ₹{selectedVariant.original_price as number})</span>
              )}
              {p.discounted_price && p.base_price !== p.discounted_price && (
                <span className="text-lg text-muted-foreground line-through">
                  ₹{p.discounted_price as string | number}
                </span>
              )}
              {(p.discount_percentage as number || 0) > 0 && (
                <Badge variant="destructive">{p.discount_percentage as number}% OFF</Badge>
              )}
              <Badge
                variant={
                  p.status === "active"
                    ? "default"
                    : p.status === "draft"
                    ? "secondary"
                    : "outline"
                }
              >
                {p.status as string}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Stock Available</p>
                <p className="text-xl font-bold">{p.total_stock_quantity as number | string}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Discount</p>
                <p className="text-xl font-bold">{(p.discount_percentage as number) || 0}%</p>
              </Card>
              {p.health_score && (
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Health Score</p>
                  <p className="text-xl font-bold">{p.health_score as number}/100</p>
                </Card>
              )}
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{description}</p>
            </div>
          </div>
        )}

        {/* DETAILS TAB */}
        {activeTab === "details" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">SKU</p>
                <p className="font-semibold break-all">{(p.sku as string) || "N/A"}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Seller Title</p>
                <p className="font-semibold">{(p.seller_title as string) || "N/A"}</p>
              </Card>
            </div>

            {p.seller_description && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Seller Description</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{p.seller_description as string}</p>
              </Card>
            )}

            {p.seller_ingredients && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Ingredients</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{p.seller_ingredients as string}</p>
              </Card>
            )}

            {p.return_policy && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Return Policy</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{p.return_policy as string}</p>
              </Card>
            )}

            {p.shipping_info && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Shipping Information</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{p.shipping_info as string}</p>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              {p.shelf_life_months && (
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Shelf Life</p>
                  <p className="font-semibold">{p.shelf_life_months as number} months</p>
                </Card>
              )}
              {p.weight_in_grams && (
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Weight</p>
                  <p className="font-semibold">{p.weight_in_grams as number}g</p>
                </Card>
              )}
            </div>

            {/* Variants with Complete P0 Details */}
            {p.listing_variants && (p.listing_variants as Array<Record<string, unknown>>).length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Variants ({(p.listing_variants as Array<Record<string, unknown>>).length})</h3>
                <div className="space-y-6">
                  {(p.listing_variants as Array<Record<string, unknown>>).map((variant) => {
                    const nutritionalInfo = variant.nutritional_info ? 
                      (typeof variant.nutritional_info === 'string' ? JSON.parse(variant.nutritional_info as string) : variant.nutritional_info) as Record<string, unknown> : null;
                    const nutrientBreakdown = variant.nutrient_breakdown ?
                      (typeof variant.nutrient_breakdown === 'string' ? JSON.parse(variant.nutrient_breakdown as string) : variant.nutrient_breakdown) as Record<string, unknown> : null;
                    
                    return (
                      <Card key={variant.variant_id as string} className="p-4">
                        {/* Variant Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-lg">{variant.variant_name as string}</p>
                              {variant.is_p0_compliant && (
                                <Badge variant="default" className="bg-green-600">P0 Compliant</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">SKU: {variant.sku as string}</p>
                            {variant.size && <p className="text-sm text-muted-foreground">Size: {variant.size as string}</p>}
                            {variant.flavor && <p className="text-sm text-muted-foreground">Flavor: {variant.flavor as string}</p>}
                          </div>
                          <div className="text-right space-y-2">
                            <div>
                              <p className="font-bold text-xl">₹{variant.price as number}</p>
                              {variant.original_price && variant.price !== variant.original_price && (
                                <p className="text-xs text-muted-foreground line-through">MRP: ₹{variant.original_price as number}</p>
                              )}
                              <p className="text-sm text-muted-foreground">{variant.stock_quantity as number} units in stock</p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-xs"
                                onClick={() => {
                                  const newStock = prompt(`Current stock: ${variant.stock_quantity}. Enter new stock quantity:`, String(variant.stock_quantity));
                                  if (newStock && !isNaN(Number(newStock))) {
                                    handleRestock(variant.variant_id as string, Number(newStock));
                                  }
                                }}
                              >
                                🔄 Restock
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                className="text-xs"
                                onClick={() => {
                                  if (confirm(`Delete variant "${variant.variant_name}"? This cannot be undone.`)) {
                                    handleDeleteVariant(variant.variant_id as string);
                                  }
                                }}
                              >
                                🗑️ Delete
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* P0 Mandatory Images (4 Photos) */}
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2 text-sm">P0 Compliance Images</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">Product Photo</p>
                              {variant.product_image_url ? (
                                <img 
                                  src={variant.product_image_url as string} 
                                  alt="Product"
                                  className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(variant.product_image_url as string, '_blank')}
                                />
                              ) : (
                                <div className="w-full h-32 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                                  No Image
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">Ingredient Label</p>
                              {variant.ingredient_image_url ? (
                                <img 
                                  src={variant.ingredient_image_url as string} 
                                  alt="Ingredients"
                                  className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(variant.ingredient_image_url as string, '_blank')}
                                />
                              ) : (
                                <div className="w-full h-32 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                                  No Image
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">Nutrition Facts</p>
                              {variant.nutrient_table_image_url ? (
                                <img 
                                  src={variant.nutrient_table_image_url as string} 
                                  alt="Nutrition Facts"
                                  className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(variant.nutrient_table_image_url as string, '_blank')}
                                />
                              ) : (
                                <div className="w-full h-32 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                                  No Image
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">FSSAI Certificate</p>
                              {variant.fssai_label_image_url ? (
                                <img 
                                  src={variant.fssai_label_image_url as string} 
                                  alt="FSSAI Label"
                                  className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(variant.fssai_label_image_url as string, '_blank')}
                                />
                              ) : (
                                <div className="w-full h-32 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                                  No Image
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* FSSAI & Compliance Info */}
                        {variant.fssai_number && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">FSSAI Number</p>
                                <p className="font-mono font-semibold">{variant.fssai_number as string}</p>
                              </div>
                              {variant.fssai_expiry_date && (
                                <div>
                                  <p className="text-xs text-muted-foreground">FSSAI Expiry</p>
                                  <p className="font-semibold">{new Date(variant.fssai_expiry_date as string).toLocaleDateString()}</p>
                                </div>
                              )}
                            </div>
                            {variant.accuracy_attested && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
                                <span>✓</span>
                                <span>Accuracy attested by {variant.attested_by as string || 'seller'}</span>
                                {variant.attested_at && (
                                  <span className="text-muted-foreground">
                                    on {new Date(variant.attested_at as string).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Batch & Date Information */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {variant.batch_number && (
                            <div className="p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Batch</p>
                              <p className="font-semibold text-sm">{variant.batch_number as string}</p>
                            </div>
                          )}
                          {variant.manufacture_date && (
                            <div className="p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Mfg. Date</p>
                              <p className="font-semibold text-sm">{new Date(variant.manufacture_date as string).toLocaleDateString()}</p>
                            </div>
                          )}
                          {variant.expiry_date && (
                            <div className="p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Expiry</p>
                              <p className="font-semibold text-sm">{new Date(variant.expiry_date as string).toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>

                        {/* Ingredient List */}
                        {variant.ingredient_list && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2 text-sm">Ingredients</h4>
                            <p className="text-sm text-foreground whitespace-pre-wrap p-3 bg-muted/30 rounded">
                              {variant.ingredient_list as string}
                            </p>
                          </div>
                        )}

                        {/* Allergen Information */}
                        {variant.allergen_info && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2 text-sm">Allergen Information</h4>
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <p className="text-sm text-orange-900">{variant.allergen_info as string}</p>
                            </div>
                          </div>
                        )}

                        {/* Nutritional Information */}
                        {nutritionalInfo && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2 text-sm">Nutritional Information</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-muted/30 rounded text-sm">
                              {nutritionalInfo.calories !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Calories</p>
                                  <p className="font-semibold">{nutritionalInfo.calories as number} kcal</p>
                                </div>
                              )}
                              {nutritionalInfo.protein !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Protein</p>
                                  <p className="font-semibold">{nutritionalInfo.protein as number}g</p>
                                </div>
                              )}
                              {nutritionalInfo.carbohydrates !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Carbs</p>
                                  <p className="font-semibold">{nutritionalInfo.carbohydrates as number}g</p>
                                </div>
                              )}
                              {nutritionalInfo.fat !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Fat</p>
                                  <p className="font-semibold">{nutritionalInfo.fat as number}g</p>
                                </div>
                              )}
                              {nutritionalInfo.saturated_fat !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Saturated Fat</p>
                                  <p className="font-semibold">{nutritionalInfo.saturated_fat as number}g</p>
                                </div>
                              )}
                              {nutritionalInfo.fiber !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Fiber</p>
                                  <p className="font-semibold">{nutritionalInfo.fiber as number}g</p>
                                </div>
                              )}
                              {nutritionalInfo.sodium !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Sodium</p>
                                  <p className="font-semibold">{nutritionalInfo.sodium as number}mg</p>
                                </div>
                              )}
                              {nutritionalInfo.calcium !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Calcium</p>
                                  <p className="font-semibold">{nutritionalInfo.calcium as number}mg</p>
                                </div>
                              )}
                              {nutritionalInfo.iron !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Iron</p>
                                  <p className="font-semibold">{nutritionalInfo.iron as number}mg</p>
                                </div>
                              )}
                              {nutritionalInfo.zinc !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Zinc</p>
                                  <p className="font-semibold">{nutritionalInfo.zinc as number}mg</p>
                                </div>
                              )}
                              {nutritionalInfo.potassium !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Potassium</p>
                                  <p className="font-semibold">{nutritionalInfo.potassium as number}mg</p>
                                </div>
                              )}
                              {nutritionalInfo.magnesium !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Magnesium</p>
                                  <p className="font-semibold">{nutritionalInfo.magnesium as number}mg</p>
                                </div>
                              )}
                              {nutritionalInfo.vitamin_a !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Vitamin A</p>
                                  <p className="font-semibold">{nutritionalInfo.vitamin_a as number}µg</p>
                                </div>
                              )}
                              {nutritionalInfo.vitamin_c !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Vitamin C</p>
                                  <p className="font-semibold">{nutritionalInfo.vitamin_c as number}mg</p>
                                </div>
                              )}
                              {nutritionalInfo.vitamin_d !== undefined && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Vitamin D</p>
                                  <p className="font-semibold">{nutritionalInfo.vitamin_d as number}µg</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Nutrient Breakdown - Formatted Display */}
                        {nutrientBreakdown && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-3 text-sm">Complete Nutrient Breakdown</h4>
                            <div className="space-y-3">
                              {/* Serving Size & Energy */}
                              <div className="grid grid-cols-3 gap-3">
                                <Card className="p-3 bg-blue-50 border-blue-200">
                                  <p className="text-xs text-muted-foreground">Serving Size</p>
                                  <p className="font-bold text-lg">{(nutrientBreakdown as Record<string, unknown>).servingSize || '100g'}</p>
                                </Card>
                                <Card className="p-3 bg-orange-50 border-orange-200">
                                  <p className="text-xs text-muted-foreground">Energy (kcal)</p>
                                  <p className="font-bold text-lg">{(nutrientBreakdown as Record<string, unknown>).energyKcal || 0}</p>
                                </Card>
                                <Card className="p-3 bg-orange-50 border-orange-200">
                                  <p className="text-xs text-muted-foreground">Energy (kJ)</p>
                                  <p className="font-bold text-lg">{(nutrientBreakdown as Record<string, unknown>).energyKj || 0}</p>
                                </Card>
                              </div>

                              {/* Macronutrients */}
                              {(nutrientBreakdown as Record<string, unknown>).macronutrients && (
                                <div>
                                  <h5 className="font-semibold text-xs text-primary mb-2">MACRONUTRIENTS</h5>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {(() => {
                                      const macros = (nutrientBreakdown as Record<string, unknown>).macronutrients as Record<string, unknown>;
                                      return (
                                        <>
                                          {macros.protein && (
                                            <div className="p-2 bg-green-50 border border-green-200 rounded">
                                              <p className="text-xs text-muted-foreground">Protein</p>
                                              <p className="font-semibold">{(macros.protein as Record<string, unknown>).value}{(macros.protein as Record<string, unknown>).unit}</p>
                                            </div>
                                          )}
                                          {macros.carbohydrate && (
                                            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                                              <p className="text-xs text-muted-foreground">Carbohydrate</p>
                                              <p className="font-semibold">{(macros.carbohydrate as Record<string, unknown>).value}{(macros.carbohydrate as Record<string, unknown>).unit}</p>
                                              {(macros.carbohydrate as Record<string, unknown>).ofWhichSugars !== undefined && (macros.carbohydrate as Record<string, unknown>).ofWhichSugars !== 0 && (
                                                <p className="text-xs text-muted-foreground">Sugars: {(macros.carbohydrate as Record<string, unknown>).ofWhichSugars}g</p>
                                              )}
                                            </div>
                                          )}
                                          {macros.fat && (
                                            <div className="p-2 bg-red-50 border border-red-200 rounded">
                                              <p className="text-xs text-muted-foreground">Total Fat</p>
                                              <p className="font-semibold">{(macros.fat as Record<string, unknown>).value}{(macros.fat as Record<string, unknown>).unit}</p>
                                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                                {(macros.fat as Record<string, unknown>).saturated !== undefined && (macros.fat as Record<string, unknown>).saturated !== 0 && (
                                                  <p>Saturated: {(macros.fat as Record<string, unknown>).saturated}g</p>
                                                )}
                                                {(macros.fat as Record<string, unknown>).trans !== undefined && (macros.fat as Record<string, unknown>).trans !== 0 && (
                                                  <p>Trans: {(macros.fat as Record<string, unknown>).trans}g</p>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}

                              {/* Fiber & Cholesterol */}
                              <div className="grid grid-cols-2 gap-2">
                                {(nutrientBreakdown as Record<string, unknown>).fiber && (
                                  <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                                    <p className="text-xs text-muted-foreground">Dietary Fiber</p>
                                    <p className="font-semibold">{((nutrientBreakdown as Record<string, unknown>).fiber as Record<string, unknown>).value}{((nutrientBreakdown as Record<string, unknown>).fiber as Record<string, unknown>).unit}</p>
                                  </div>
                                )}
                                {(nutrientBreakdown as Record<string, unknown>).cholesterol && (
                                  <div className="p-2 bg-purple-50 border border-purple-200 rounded">
                                    <p className="text-xs text-muted-foreground">Cholesterol</p>
                                    <p className="font-semibold">{((nutrientBreakdown as Record<string, unknown>).cholesterol as Record<string, unknown>).value}{((nutrientBreakdown as Record<string, unknown>).cholesterol as Record<string, unknown>).unit}</p>
                                  </div>
                                )}
                              </div>

                              {/* Micronutrients */}
                              {(nutrientBreakdown as Record<string, unknown>).micronutrients && (
                                <div>
                                  <h5 className="font-semibold text-xs text-primary mb-2">MICRONUTRIENTS (Vitamins & Minerals)</h5>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {(() => {
                                      const micros = (nutrientBreakdown as Record<string, unknown>).micronutrients as Record<string, unknown>;
                                      const microEntries = Object.entries(micros).filter(([, v]) => {
                                        const val = v as Record<string, unknown>;
                                        return val && val.value !== 0;
                                      });
                                      
                                      if (microEntries.length === 0) {
                                        return (
                                          <div className="col-span-full p-3 bg-gray-50 border border-gray-200 rounded text-center">
                                            <p className="text-xs text-muted-foreground">No micronutrient data available</p>
                                          </div>
                                        );
                                      }

                                      return microEntries.map(([key, value]) => {
                                        const val = value as Record<string, unknown>;
                                        const displayName = key
                                          .replace(/([A-Z])/g, ' $1')
                                          .replace(/^./, (str) => str.toUpperCase())
                                          .trim();
                                        
                                        return (
                                          <div key={key} className="p-2 bg-indigo-50 border border-indigo-200 rounded">
                                            <p className="text-xs text-muted-foreground">{displayName}</p>
                                            <p className="font-semibold text-sm">{val.value}{val.unit}</p>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ALLERGENS TAB */}
        {activeTab === "allergens" && (
          <div className="space-y-4">
            <h3 className="font-semibold mb-3">Allergen Information by Variant</h3>
            {variants && variants.length > 0 ? (
              <div className="space-y-3">
                {variants.map((variant) => {
                  const allergenInfo = variant.allergen_info as string;
                  const hasAllergens = allergenInfo && allergenInfo !== 'NA' && allergenInfo.trim() !== '';
                  
                  return (
                    <Card key={variant.variant_id as string} className="p-3">
                      <h4 className="font-medium mb-2">{variant.variant_name as string}</h4>
                      {hasAllergens ? (
                        <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-orange-800 text-sm">Contains Allergens</p>
                            <p className="text-sm text-orange-900 mt-1">{allergenInfo}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-green-800 font-medium text-sm">✓ No Known Allergens</p>
                          <p className="text-xs text-green-700 mt-1">This variant has no listed allergens.</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-800 font-semibold">✓ No Known Allergens</p>
                <p className="text-sm text-green-700 mt-1">This product has no listed allergens.</p>
              </div>
            )}
          </div>
        )}

        {/* TRANSPARENCY TAB */}
        {activeTab === "transparency" && (
          <div className="space-y-4">
            {p.certifications || p.third_party_testing || p.sourcing_info ? (
              <>
                {p.certifications && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Certifications</h3>
                    <p className="text-sm whitespace-pre-wrap">{p.certifications as string}</p>
                  </Card>
                )}
                {p.third_party_testing && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Third-Party Testing</h3>
                    <p className="text-sm whitespace-pre-wrap">{p.third_party_testing as string}</p>
                  </Card>
                )}
                {p.sourcing_info && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Sourcing Information</h3>
                    <p className="text-sm whitespace-pre-wrap">{p.sourcing_info as string}</p>
                  </Card>
                )}
              </>
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-muted-foreground">No transparency information added yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderBundleContent = () => {
    if (!bundle) return null;

    const b = bundle as Record<string, unknown>;

    return (
      <div className="space-y-6">
        {/* Bundle Header */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{b.bundle_name as string}</h2>
          {b.description && (
            <p className="text-sm text-muted-foreground">{b.description as string}</p>
          )}

          <div className="flex items-baseline gap-2 pt-2">
            <span className="text-3xl font-bold">₹{(b.discounted_price as number)?.toFixed(2)}</span>
            {b.base_price !== b.discounted_price && (
              <span className="text-lg text-muted-foreground line-through">
                ₹{(b.base_price as number)?.toFixed(2)}
              </span>
            )}
            {(b.discount_percentage as number) > 0 && (
              <Badge variant="destructive">{b.discount_percentage as number}% OFF</Badge>
            )}
          </div>
        </div>

        {/* Bundle Stats */}
        <div className="grid grid-cols-3 gap-4 py-4 bg-muted/50 rounded-lg p-4">
          <div>
            <p className="text-xs text-muted-foreground">Products</p>
            <p className="text-lg font-bold">{b.total_items as number}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Stock</p>
            <p className="text-lg font-bold">{b.total_stock_quantity as number}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge
              variant={
                b.status === "active"
                  ? "default"
                  : b.status === "draft"
                  ? "secondary"
                  : "outline"
              }
            >
              {b.status as string}
            </Badge>
          </div>
        </div>

        {/* Bundle Items */}
        {bundleItems.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Bundle Contains</h3>
            <div className="space-y-3">
              {bundleItems.map((item) => {
                const itemRec = item as Record<string, unknown>;
                const product = itemRec.seller_product_listings as Record<string, unknown>;
                const listingImages = product.listing_images as ListingImage[] | undefined;
                const primaryImage = listingImages?.find((img) => img.is_primary);
                const productName =
                  (product.seller_title as string) ||
                  ((product.global_products as Record<string, unknown>)?.product_name as string) ||
                  "Untitled";

                return (
                  <Card key={itemRec.bundle_item_id as string} className="p-3">
                    <div className="flex gap-3">
                      {primaryImage?.image_url ? (
                        <img
                          src={primaryImage.image_url}
                          alt={productName}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-16 h-16 bg-muted rounded">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{productName}</p>
                        <p className="text-xs text-muted-foreground mb-1">
                          ₹{product.base_price as number} x {itemRec.quantity as number}
                        </p>
                        <p className="text-sm font-semibold">
                          ₹{((product.base_price as number) * (itemRec.quantity as number)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productId ? "Product Details" : "Bundle Details"}</DialogTitle>
          <DialogClose />
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : productId && !product ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Failed to load product details</p>
          </div>
        ) : productId ? (
          renderProductContent()
        ) : bundleId && !bundle ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Failed to load bundle details</p>
          </div>
        ) : (
          renderBundleContent()
        )}
      </DialogContent>
    </Dialog>
  );
}
