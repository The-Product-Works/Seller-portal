import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Package, ShoppingCart, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OrderItemWithRelations {
  listing_id: string;
  quantity: number;
  price_per_unit: number;
  seller_product_listings: {
    listing_id: string;
    seller_title: string;
    base_price: number;
    total_stock_quantity: number;
    seller_id: string;
  };
  orders: {
    status: string;
    seller_id: string;
    created_at: string;
  };
}

interface ProductSales {
  listing_id: string;
  seller_title: string;
  total_sold: number;
  order_count: number;
  revenue: number;
  stock_quantity: number;
  base_price: number;
}

interface BestWorstSellingProps {
  sellerId?: string | null;
}

export function BestWorstSelling({ sellerId }: BestWorstSellingProps) {
  const [bestSelling, setBestSelling] = useState<ProductSales[]>([]);
  const [worstSelling, setWorstSelling] = useState<ProductSales[]>([]);
  const [loading, setLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "year">("month");

  useEffect(() => {
    if (sellerId) {
      loadSalesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, timePeriod]);

  const loadSalesData = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      // Calculate date range based on time period
      const now = new Date();
      let startDate: Date;
      
      switch (timePeriod) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get sales data from order_items joined with seller_product_listings
      const { data: salesData, error } = await supabase
        .from("order_items")
        .select(`
          listing_id,
          quantity,
          price_per_unit,
          seller_product_listings!inner (
            listing_id,
            seller_title,
            base_price,
            total_stock_quantity,
            seller_id
          ),
          orders!inner (
            status,
            seller_id,
            created_at
          )
        `)
        .eq("seller_product_listings.seller_id", sellerId)
        .eq("orders.seller_id", sellerId)
        .neq("orders.status", "cancelled")
        .neq("orders.status", "refunded")
        .gte("orders.created_at", startDate.toISOString());

      if (error) {
        console.error("Error fetching sales data:", error);
        return;
      }

      // Group by listing_id and calculate totals
      const salesMap = new Map<string, {
        listing_id: string;
        seller_title: string;
        total_sold: number;
        order_count: number;
        revenue: number;
        stock_quantity: number;
        base_price: number;
      }>();

      salesData?.forEach((item: OrderItemWithRelations) => {
        const listingId = item.listing_id;
        const existing = salesMap.get(listingId);
        
        if (existing) {
          existing.total_sold += item.quantity;
          existing.order_count += 1;
          existing.revenue += item.quantity * item.price_per_unit;
        } else {
          salesMap.set(listingId, {
            listing_id: listingId,
            seller_title: item.seller_product_listings.seller_title || "Unknown Product",
            total_sold: item.quantity,
            order_count: 1,
            revenue: item.quantity * item.price_per_unit,
            stock_quantity: item.seller_product_listings.total_stock_quantity || 0,
            base_price: item.seller_product_listings.base_price,
          });
        }
      });

      const salesArray = Array.from(salesMap.values());
      
      // Calculate performance score for better ranking
      // Formula: (units_sold * 0.5) + (revenue/1000 * 0.3) + (order_count * 0.2)
      const scoredProducts = salesArray.map(product => ({
        ...product,
        performance_score: (product.total_sold * 0.5) + 
                          (product.revenue / 1000 * 0.3) + 
                          (product.order_count * 0.2)
      }));
      
      // Sort by performance score for best sellers
      const sortedBest = [...scoredProducts]
        .sort((a, b) => b.performance_score - a.performance_score)
        .slice(0, 5);
        
      // Sort by performance score for worst sellers (but only products with sales)
      const sortedWorst = [...scoredProducts]
        .filter(item => item.total_sold > 0)
        .sort((a, b) => a.performance_score - b.performance_score)
        .slice(0, 5);

      setBestSelling(sortedBest);
      setWorstSelling(sortedWorst);
    } catch (error) {
      console.error("Exception loading sales data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Best Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Low Performing Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bestSelling.length === 0 && worstSelling.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Best Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              No sales data available yet
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Low Performing Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              No sales data available yet
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Period Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={timePeriod} onValueChange={(value: "week" | "month" | "year") => setTimePeriod(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
            <SelectItem value="year">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
      {/* Best Selling Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Best Selling Products
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bestSelling.map((product, index) => (
            <div key={product.listing_id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-sm">{product.seller_title}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {product.total_sold} sold
                    </span>
                    <span className="flex items-center gap-1">
                      <ShoppingCart className="h-3 w-3" />
                      {product.order_count} orders
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">₹{product.revenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Low Performing Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-orange-600" />
            Low Performing Products
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {worstSelling.map((product, index) => (
            <div key={product.listing_id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-600 text-white rounded-full text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-sm">{product.seller_title}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {product.total_sold} sold
                    </span>
                    <span className="flex items-center gap-1">
                      <ShoppingCart className="h-3 w-3" />
                      {product.order_count} orders
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-orange-600">₹{product.revenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
