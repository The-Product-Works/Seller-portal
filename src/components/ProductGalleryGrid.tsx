import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProductImageGalleryCard } from "@/components/ProductImageGalleryCard";
import type { ListingWithDetails } from "@/types/inventory.types";

interface ProductImage {
  image_id: string;
  image_url: string;
  is_primary?: boolean;
}

interface ProductCard {
  id: string;
  type: "product" | "bundle";
  name: string;
  description?: string;
  images: ProductImage[];
  stock: number;
  low_stock: boolean;
  status: string;
  price: number;
  discount_percentage?: number;
  health_score?: number;
  certifications?: Record<string, unknown>;
}

interface ProductGalleryGridProps {
  sellerId?: string | null;
  limit?: number;
  showOnlyOutOfStock?: boolean;
}

interface SellerProductListing {
  listing_id: string;
  seller_title: string;
  seller_description?: string;
  base_price: number;
  discount_percentage?: number;
  total_stock_quantity: number;
  status: string;
  health_score?: number;
  seller_certifications?: Record<string, unknown>;
  listing_images: ProductImage[];
}

interface BundleRecord {
  bundle_id: string;
  bundle_name: string;
  base_price: number;
  discount_percentage?: number;
  total_stock_quantity: number;
  status: string;
}

export function ProductGalleryGrid({ sellerId, limit = 12, showOnlyOutOfStock = false }: ProductGalleryGridProps) {
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    if (sellerId) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const loadProducts = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      // Fetch seller product listings
      const { data: listings, error: listingsError } = await supabase
        .from("seller_product_listings")
        .select(
          `
          listing_id,
          seller_title,
          seller_description,
          base_price,
          discount_percentage,
          total_stock_quantity,
          status,
          health_score,
          seller_certifications,
          listing_images(image_id, image_url, is_primary)
        `
        )
        .eq("seller_id", sellerId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (listingsError) throw listingsError;

      const productList: ProductCard[] = [];
      const lowStockThreshold = 10;
      let lowCount = 0;

      if (listings && listings.length > 0) {
        listings.forEach((listing: ListingWithDetails) => {
          const stock = listing.total_stock_quantity || 0;
          const isLowStock = stock < lowStockThreshold;
          if (isLowStock) lowCount++;

          // Only include out of stock products if showOnlyOutOfStock is true
          if (!showOnlyOutOfStock || stock === 0) {
            productList.push({
              id: listing.listing_id,
              type: "product",
              name: listing.seller_title,
              description: listing.seller_description,
              images: listing.listing_images || [],
              stock: stock,
              low_stock: isLowStock,
              status: listing.status,
              price: listing.base_price,
              discount_percentage: listing.discount_percentage,
              health_score: listing.health_score,
              certifications: listing.seller_certifications,
            });
          }
        });
      }

      // Fetch bundles
      const { data: bundles, error: bundlesError } = await supabase
        .from("bundles")
        .select(
          `
          bundle_id,
          bundle_name,
          base_price,
          discount_percentage,
          total_stock_quantity,
          status
        `
        )
        .eq("seller_id", sellerId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(Math.floor(limit / 2));

      if (bundlesError) {
        console.warn("Error fetching bundles:", bundlesError);
      }

      if (bundles && bundles.length > 0) {
        bundles.forEach((bundle: BundleRecord) => {
          const stock = bundle.total_stock_quantity || 0;
          const isLowStock = stock < lowStockThreshold;
          if (isLowStock) lowCount++;

          // Only include out of stock bundles if showOnlyOutOfStock is true
          if (!showOnlyOutOfStock || stock === 0) {
            productList.push({
              id: bundle.bundle_id,
              type: "bundle",
              name: bundle.bundle_name,
              images: [], // Bundles don't have images directly
              stock: stock,
              low_stock: isLowStock,
              status: bundle.status,
              price: bundle.base_price,
              discount_percentage: bundle.discount_percentage,
            });
          }
        });
      }

      setProducts(productList);
      setLowStockCount(lowCount);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No products added yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayPrice = (product: ProductCard) => {
    if (product.discount_percentage) {
      return (product.price * (1 - product.discount_percentage / 100)).toFixed(2);
    }
    return product.price.toFixed(2);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Products & Bundles</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {products.length} item(s) • {lowStockCount} low stock
            </p>
          </div>
          {lowStockCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {lowStockCount} Low
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {lowStockCount > 0 && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-600">
              {lowStockCount} item(s) have low stock. Use the Restock button to add inventory.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={`${product.type}-${product.id}`} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {/* Image Gallery */}
              {product.images.length > 0 ? (
                <ProductImageGalleryCard
                  images={product.images}
                  productName={product.name}
                  className="h-48"
                />
              ) : (
                <div className="h-48 bg-muted flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              {/* Product Info */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                    <Badge className="flex-shrink-0 text-xs">
                      {product.type === "bundle" ? "Bundle" : "Product"}
                    </Badge>
                  </div>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {product.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{product.status}</p>
                </div>

                {/* Health Score */}
                {product.health_score && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Health Score:</span>
                    <Badge variant={product.health_score >= 80 ? "default" : product.health_score >= 60 ? "secondary" : "destructive"}>
                      {product.health_score}/100
                    </Badge>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center gap-2">
                  <span className="font-bold">₹{displayPrice(product)}</span>
                  {product.discount_percentage && product.discount_percentage > 0 && (
                    <>
                      <span className="text-xs line-through text-muted-foreground">
                        ₹{product.price.toFixed(2)}
                      </span>
                      <span className="text-xs font-medium text-green-600">
                        -{product.discount_percentage}%
                      </span>
                    </>
                  )}
                </div>

                {/* Stock Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-bold text-sm ${product.stock === 0 ? 'text-red-600' : product.low_stock ? 'text-amber-600' : 'text-green-600'}`}>
                      {product.stock} units
                    </p>
                    <p className="text-xs text-muted-foreground">In Stock</p>
                  </div>
                  {product.stock === 0 && (
                    <Badge variant="destructive" className="text-xs">
                      Out of Stock
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1" 
                    variant="outline"
                    onClick={() => {
                      // Navigate to inventory page for editing
                      window.location.href = '/inventory';
                    }}
                  >
                    <Package className="h-3 w-3 mr-2" />
                    View in Inventory
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

    </Card>
  );
}
