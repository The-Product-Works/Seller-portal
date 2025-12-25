import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingDown, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ListingWithDetails, BundleWithDetails } from "@/types/inventory.types";

interface ListingImage {
  image_url: string;
  is_primary: boolean;
}

interface VariantCount {
  count: number;
}

interface ListingData {
  listing_id: string;
  seller_title: string;
  base_price: number;
  discount_percentage?: number;
  total_stock_quantity: number;
  status: string;
  listing_images: ListingImage[];
  listing_variants: VariantCount[];
}

interface BundleData {
  bundle_id: string;
  bundle_name: string;
  base_price: number;
  discount_percentage?: number;
  total_stock_quantity: number;
  status: string;
}

interface ProductStockInfo {
  id: string;
  type: "product" | "bundle";
  name: string;
  image_url?: string;
  stock: number;
  low_stock: boolean;
  status: string;
  price: number;
  discount_percentage?: number;
  variant_count?: number;
}

interface DashboardProductStockProps {
  sellerId?: string | null;
  limit?: number;
}

export function DashboardProductStock({ sellerId, limit = 8 }: DashboardProductStockProps) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductStockInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(true);

  useEffect(() => {
    if (sellerId) {
      loadProductStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const loadProductStock = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      // Fetch seller product listings with stock info
      const { data: listings, error: listingsError } = await supabase
        .from("seller_product_listings")
        .select(
          `
          listing_id,
          seller_title,
          base_price,
          discount_percentage,
          total_stock_quantity,
          status,
          listing_images(image_url, is_primary),
          listing_variants(count)
        `
        )
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (listingsError) {
        console.error("Error fetching listings:", listingsError);
      }

      // Fetch bundles with bundle items to calculate actual stock
      const { data: bundles, error: bundlesError } = await supabase
        .from("bundles")
        .select(
          `
          bundle_id,
          bundle_name,
          base_price,
          discount_percentage,
          total_stock_quantity,
          status,
          bundle_items(
            quantity,
            seller_product_listings(
              total_stock_quantity
            )
          )
        `
        )
        .eq("seller_id", sellerId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit / 2);

      if (bundlesError) {
        console.error("Error fetching bundles:", bundlesError);
      }

      // Convert listings to product stock info
      const productStockList: ProductStockInfo[] = [];
      const lowStockThreshold = 10;
      let lowCount = 0;

      if (listings && listings.length > 0) {
        listings.forEach((listing: ListingData) => {
          const stock = listing.total_stock_quantity || 0;
          const isLowStock = stock < lowStockThreshold;
          if (isLowStock) lowCount++;

          const primaryImage = listing.listing_images?.find((img: ListingImage) => img.is_primary);

          productStockList.push({
            id: listing.listing_id,
            type: "product",
            name: listing.seller_title,
            image_url: primaryImage?.image_url,
            stock: stock,
            low_stock: isLowStock,
            status: listing.status,
            price: listing.base_price,
            discount_percentage: listing.discount_percentage,
            variant_count: listing.listing_variants?.[0]?.count || 0,
          });
        });
      }

      if (bundles && bundles.length > 0) {
        bundles.forEach((bundle: any) => {
          // Calculate actual bundle stock from bundle items
          const bundleItems = bundle.bundle_items || [];
          let calculatedStock = 0;
          
          if (bundleItems.length > 0) {
            const possibleBundles = bundleItems.map((item: any) => {
              const productStock = item.seller_product_listings?.total_stock_quantity || 0;
              const requiredPerBundle = item.quantity || 1;
              return Math.floor(productStock / requiredPerBundle);
            });
            calculatedStock = possibleBundles.length > 0 ? Math.min(...possibleBundles) : 0;
          }
          
          const stock = calculatedStock;
          const isLowStock = stock < lowStockThreshold;
          if (isLowStock) lowCount++;

          productStockList.push({
            id: bundle.bundle_id,
            type: "bundle",
            name: bundle.bundle_name,
            stock: stock,
            low_stock: isLowStock,
            status: bundle.status,
            price: bundle.base_price,
            discount_percentage: bundle.discount_percentage,
          });
        });
      }

      setProducts(productStockList);
      setLowStockCount(lowCount);
    } catch (error) {
      console.error("Error loading product stock:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Inventory Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Inventory Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No products added yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Product Inventory Stock</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {products.length} product(s) • {lowStockCount} low stock
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lowStockCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {lowStockCount} Low
              </Badge>
            )}
            {lowStockCount > 0 && (
              <Button
                size="sm"
                variant={showOnlyLowStock ? "default" : "outline"}
                onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
                className="text-xs"
              >
                {showOnlyLowStock ? "All Products" : "Low Stock Only"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {lowStockCount > 0 && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <TrendingDown className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-600">
              {lowStockCount} product(s) have low stock (less than 10 units). Click on Inventory to restock.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {products
            .filter(p => !showOnlyLowStock || p.low_stock)
            .map((product) => {
            const displayPrice = product.discount_percentage
              ? (product.price * (1 - product.discount_percentage / 100)).toFixed(2)
              : product.price.toFixed(2);
            const originalPrice = product.price.toFixed(2);

            return (
              <div
                key={`${product.type}-${product.id}`}
                onClick={() => {
                  if (product.low_stock) {
                    // Navigate to inventory page with product ID as filter
                    navigate(`/inventory?restockProductId=${product.id}`);
                  }
                }}
                className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  product.low_stock
                    ? "border-red-200 bg-red-50/30 cursor-pointer hover:bg-red-50/50 hover:border-red-300"
                    : "border-border bg-muted/30 hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <Badge
                        variant="outline"
                        className="flex-shrink-0 text-xs"
                      >
                        {product.type === "bundle" ? "Bundle" : "Product"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>₹{displayPrice}</span>
                      {product.discount_percentage && product.discount_percentage > 0 && (
                        <>
                          <span className="line-through">₹{originalPrice}</span>
                          <span className="text-green-600">-{product.discount_percentage}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <div
                      className={`font-bold text-sm ${
                        product.low_stock ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {product.stock}
                    </div>
                    <p className="text-xs text-muted-foreground">Stock</p>
                  </div>
                  {product.low_stock && (
                    <div className="flex-shrink-0">
                      <Badge variant="destructive" className="text-xs cursor-pointer">
                        Click to Restock
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
