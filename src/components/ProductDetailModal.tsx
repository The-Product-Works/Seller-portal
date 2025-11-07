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

interface ProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  bundleId?: string;
}

interface ListingImage {
  image_url: string;
  is_primary?: boolean;
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
            description,
            product_images (image_url),
            brands (name),
            allergens
          ),
          listing_images (image_url, is_primary),
          listing_variants (
            variant_id,
            variant_name,
            sku,
            stock_quantity,
            price_adjustment
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
    } catch (error) {
      console.error("Error loading product:", error);
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

  const renderProductContent = () => {
    if (!product) return null;

    const p = product as Record<string, unknown>;
    const primaryImage = allImages?.find((img) => img.is_primary) || allImages?.[selectedImage];
    const brandName = (p.global_products as Record<string, unknown>)?.brands?.name || "Unknown Brand";
    const productName = p.seller_title || (p.global_products as Record<string, unknown>)?.product_name || "Untitled";
    const description = (p.global_products as Record<string, unknown>)?.description || p.description || "No description available";
    const allergens = (p.global_products as Record<string, unknown>)?.allergens || [];

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
              <span className="text-3xl font-bold">₹{p.base_price as string | number}</span>
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

            {/* Variants */}
            {p.listing_variants && (p.listing_variants as Array<Record<string, unknown>>).length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Variants ({(p.listing_variants as Array<Record<string, unknown>>).length})</h3>
                <div className="space-y-2">
                  {(p.listing_variants as Array<Record<string, unknown>>).map((variant) => (
                    <Card key={variant.variant_id as string} className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{variant.variant_name as string}</p>
                          <p className="text-xs text-muted-foreground">SKU: {variant.sku as string}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{variant.stock_quantity as number} units</p>
                          {variant.price_adjustment && (
                            <p className="text-xs text-primary">+₹{variant.price_adjustment as number}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ALLERGENS TAB */}
        {activeTab === "allergens" && (
          <div className="space-y-4">
            {allergens && allergens.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <span className="font-semibold text-orange-800">Contains {allergens.length} Allergen(s)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allergens.map((allergen: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="bg-orange-50 border-orange-300 text-orange-900">
                      {allergen}
                    </Badge>
                  ))}
                </div>
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
