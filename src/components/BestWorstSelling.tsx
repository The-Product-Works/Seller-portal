import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProductSales {
  id: string;
  name: string;
  orderCount: number;
  totalQuantity: number;
}

interface BestWorstSellingProps {
  sellerId?: string | null;
}

interface Order {
  product_id: string | null;
  bundle_id: string | null;
  quantity: number;
}

interface Product {
  listing_id: string;
  seller_title: string;
}

interface Bundle {
  bundle_id: string;
  bundle_name: string;
}

export function BestWorstSelling({ sellerId }: BestWorstSellingProps) {
  const [bestSelling, setBestSelling] = useState<ProductSales[]>([]);
  const [worstSelling, setWorstSelling] = useState<ProductSales[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sellerId) {
      loadSalesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const loadSalesData = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      // Get all orders for this seller
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", sellerId)
        .neq("status", "cancelled");

      if (error || !orders) {
        console.error("Error loading orders:", error);
        setLoading(false);
        return;
      }

      // Count by product/bundle
      const salesByProduct: Record<string, { quantity: number; count: number }> = {};

      for (const order of orders as Order[]) {
        const itemId = order.product_id || order.bundle_id;
        if (!itemId) continue;

        if (!salesByProduct[itemId]) {
          salesByProduct[itemId] = { quantity: 0, count: 0 };
        }
        salesByProduct[itemId].quantity += order.quantity || 1;
        salesByProduct[itemId].count += 1;
      }

      // Get product names for best/worst selling
      const productIds = Object.keys(salesByProduct).filter(id => id && (orders as Order[]).some(o => o.product_id === id));
      const bundleIds = Object.keys(salesByProduct).filter(id => id && (orders as Order[]).some(o => o.bundle_id === id));

      const productNames: Record<string, string> = {};
      const bundleNames: Record<string, string> = {};

      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("seller_product_listings")
          .select("listing_id, seller_title");

        if (products) {
          (products as Product[]).forEach((p) => {
            productNames[p.listing_id] = p.seller_title;
          });
        }
      }

      if (bundleIds.length > 0) {
        const { data: bundles } = await supabase
          .from("bundles")
          .select("bundle_id, bundle_name");

        if (bundles) {
          (bundles as Bundle[]).forEach((b) => {
            bundleNames[b.bundle_id] = b.bundle_name;
          });
        }
      }

      // Convert to array and sort
      const salesArray = Object.entries(salesByProduct).map(([id, sales]) => ({
        id,
        name: productNames[id] || bundleNames[id] || `Product ${id.substring(0, 8)}`,
        orderCount: sales.count,
        totalQuantity: sales.quantity,
      }));

      // Sort by quantity sold
      salesArray.sort((a, b) => b.totalQuantity - a.totalQuantity);

      setBestSelling(salesArray.slice(0, 3));
      setWorstSelling(salesArray.slice(-3).reverse());
    } catch (error) {
      console.error("Error in loadSalesData:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Best & Worst Selling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bestSelling.length === 0 && worstSelling.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Best & Worst Selling</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No sales data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Best & Worst Selling</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Best Selling */}
        {bestSelling.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              Top Selling Products
            </h3>
            <div className="space-y-2">
              {bestSelling.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600">#{index + 1}</Badge>
                      <p className="text-sm font-medium truncate">{product.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {product.orderCount} orders • {product.totalQuantity} units sold
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-green-600">
                      {product.totalQuantity}
                    </p>
                    <p className="text-xs text-muted-foreground">units</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Worst Selling */}
        {worstSelling.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-red-600">
              <TrendingDown className="h-4 w-4" />
              Least Selling Products
            </h3>
            <div className="space-y-2">
              {worstSelling.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-red-300 text-red-700">
                        #{worstSelling.length - index}
                      </Badge>
                      <p className="text-sm font-medium truncate">{product.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {product.orderCount} orders • {product.totalQuantity} units sold
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-red-600">
                      {product.totalQuantity}
                    </p>
                    <p className="text-xs text-muted-foreground">units</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
