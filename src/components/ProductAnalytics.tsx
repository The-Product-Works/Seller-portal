import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";

interface ProductAnalyticsData {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  totalRevenue: number;
  averagePrice: number;
  topCategories: { category: string; count: number }[];
  revenueByStatus: {
    active: number;
    draft: number;
  };
  productsByPrice: {
    budget: number; // <100
    mid: number; // 100-500
    premium: number; // >500
  };
}

interface ProductAnalyticsProps {
  sellerId?: string;
}

export function ProductAnalytics({ sellerId: propSellerId }: ProductAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ProductAnalyticsData>({
    totalProducts: 0,
    activeProducts: 0,
    draftProducts: 0,
    totalRevenue: 0,
    averagePrice: 0,
    topCategories: [],
    revenueByStatus: { active: 0, draft: 0 },
    productsByPrice: { budget: 0, mid: 0, premium: 0 }
  });
  const [loading, setLoading] = useState(true);

  const loadSellerAndAnalytics = useCallback(async () => {
    const sellerId = await getAuthenticatedSellerId();
    if (sellerId) {
      await loadProductAnalytics(sellerId);
    }
  }, []);

  useEffect(() => {
    if (propSellerId) {
      loadProductAnalytics(propSellerId);
    } else {
      loadSellerAndAnalytics();
    }
  }, [propSellerId, loadSellerAndAnalytics]);

  const loadProductAnalytics = async (sellerId: string) => {
    setLoading(true);
    try {
      // Get all products with their details
      const { data: products, error: productsError } = await supabase
        .from("seller_product_listings")
        .select(`
          listing_id,
          seller_title,
          base_price,
          status,
          created_at,
          listing_variants(
            variant_id,
            price,
            stock_quantity
          )
        `)
        .eq("seller_id", sellerId);

      if (productsError) {
        console.error("Error fetching products:", productsError);
        setLoading(false);
        return;
      }

      // Get revenue from completed orders (excluding cancelled)
      const { data: orderItems, error: orderError } = await supabase
        .from("order_items")
        .select(`
          listing_id,
          order_id,
          quantity,
          price_per_unit,
          subtotal
        `)
        .eq("seller_id", sellerId);

      if (orderError) {
        console.error("Error fetching order items:", orderError);
      }

      // Get non-cancelled orders to filter items
      const { data: orders } = await supabase
        .from("orders")
        .select("order_id, status")
        .eq("seller_id", sellerId)
        .neq("status", "cancelled");

      interface OrderItem {
        listing_id: string;
        order_id: string;
        quantity: number;
        price_per_unit: number;
        subtotal: number | null;
      }

      const nonCancelledOrderIds = new Set((orders || []).map((o: {order_id: string; status: string}) => o.order_id));

      // Calculate analytics
      const totalProducts = products?.length || 0;
      const activeProducts = products?.filter(p => p.status === "active").length || 0;
      const draftProducts = products?.filter(p => p.status === "draft").length || 0;

      // Calculate total revenue from non-cancelled orders
      const totalRevenue = (orderItems as OrderItem[] || [])
        .filter((item: OrderItem) => nonCancelledOrderIds.has(item.order_id))
        .reduce((sum, item: OrderItem) => {
          return sum + (item.subtotal || (item.quantity * item.price_per_unit));
        }, 0) || 0;

      // Calculate average price
      const allPrices = products?.map(p => p.base_price).filter(price => price > 0) || [];
      const averagePrice = allPrices.length > 0 
        ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length 
        : 0;

      // Analyze product titles for categories (basic keyword analysis)
      const categoryCount: Record<string, number> = {};
      const categoryKeywords = {
        'Food': ['food', 'snack', 'organic', 'nutrition', 'dietary'],
        'Health': ['health', 'vitamin', 'supplement', 'wellness'],
        'Beauty': ['beauty', 'skincare', 'cosmetic', 'lotion'],
        'Home': ['home', 'kitchen', 'cleaning', 'household'],
        'Other': []
      };
      
      products?.forEach(product => {
        const title = (product.seller_title || '').toLowerCase();
        let assigned = false;
        
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
          if (category !== 'Other' && keywords.some(keyword => title.includes(keyword))) {
            categoryCount[category] = (categoryCount[category] || 0) + 1;
            assigned = true;
            break;
          }
        }
        
        if (!assigned) {
          categoryCount['Other'] = (categoryCount['Other'] || 0) + 1;
        }
      });
      
      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Revenue by status
      const activeRevenue = (orderItems as OrderItem[] || [])
        .filter((item: OrderItem) => nonCancelledOrderIds.has(item.order_id))
        .reduce((sum, item: OrderItem) => {
          const product = products?.find(p => p.listing_id === item.listing_id);
          if (product?.status === "active") {
            return sum + (item.subtotal || (item.quantity * item.price_per_unit));
          }
          return sum;
        }, 0) || 0;

      const draftRevenue = totalRevenue - activeRevenue;

      // Products by price range
      const budget = products?.filter(p => p.base_price < 100).length || 0;
      const mid = products?.filter(p => p.base_price >= 100 && p.base_price <= 500).length || 0;
      const premium = products?.filter(p => p.base_price > 500).length || 0;

      setAnalytics({
        totalProducts,
        activeProducts,
        draftProducts,
        totalRevenue,
        averagePrice,
        topCategories,
        revenueByStatus: { active: activeRevenue, draft: draftRevenue },
        productsByPrice: { budget, mid, premium }
      });

    } catch (error) {
      console.error("Error loading product analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activePercentage = analytics.totalProducts > 0 
    ? (analytics.activeProducts / analytics.totalProducts) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeProducts} active, {analytics.draftProducts} draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analytics.totalRevenue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              From all non-cancelled orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analytics.averagePrice.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Per product listing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePercentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Products currently active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Product Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Active Products</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{analytics.activeProducts}</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{analytics.revenueByStatus.active.toFixed(0)} revenue
                  </p>
                </div>
              </div>
              <Progress value={activePercentage} className="h-2" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Draft Products</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{analytics.draftProducts}</p>
                  <p className="text-xs text-muted-foreground">
                    Not yet published
                  </p>
                </div>
              </div>
              <Progress value={100 - activePercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Price Range Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Price Range Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    Budget
                  </Badge>
                  <span className="text-sm">Under ₹100</span>
                </div>
                <span className="font-semibold">{analytics.productsByPrice.budget}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    Mid-range
                  </Badge>
                  <span className="text-sm">₹100 - ₹500</span>
                </div>
                <span className="font-semibold">{analytics.productsByPrice.mid}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-purple-600 border-purple-200">
                    Premium
                  </Badge>
                  <span className="text-sm">Over ₹500</span>
                </div>
                <span className="font-semibold">{analytics.productsByPrice.premium}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Categories */}
        {analytics.topCategories.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Top Product Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {analytics.topCategories.map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <span className="font-medium capitalize">{category.category}</span>
                    </div>
                    <span className="text-sm font-semibold">{category.count} products</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}