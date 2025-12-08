import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import { SellerGraph } from "@/components/SellerGraph";
import { SellerOrders } from "@/components/SellerOrders";
import { BestWorstSelling } from "@/components/BestWorstSelling";
import { ProductAnalytics } from "@/components/ProductAnalytics";
import { ProductGalleryGrid } from "@/components/ProductGalleryGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Package, ShoppingCart, Clock, AlertCircle, RefreshCw, Star, Shield, TrendingUp, Flag } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LowStockNotifications } from "@/components/LowStockNotifications";
import { LowStockNotificationsBundle } from "@/components/LowStockNotificationsBundle";
import { FSSAIExpiryNotifications } from "@/components/FSSAIExpiryNotifications";
import { TestEmailButton } from "@/components/TestEmailButton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bundle } from "@/types/bundle.types";
import { SimpleRestockDialog } from "@/components/SimpleRestockDialog";
import { SellerRaiseDispute } from "@/components/SellerRaiseDispute";

interface ListingWithDetails {
  listing_id: string;
  seller_id: string;
  seller_title: string;
  total_stock_quantity: number;
  base_price: number;
  status: string;
  created_at: string;
  global_products?: {
    product_name: string;
    category_name: string;
  };
  listing_images?: Array<{ image_url: string; is_primary: boolean }>;
}

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  pendingOrders: number;
  averageRating: number;
  lowStockCount: number;
  productLowStockCount: number;
  bundleLowStockCount: number;
  bundlesLowStock?: Array<{
    bundle_id: string;
    bundle_name: string;
    total_stock_quantity: number;
    lowStockItems?: string[];
  }>;
}

interface CategoryRevenue {
  category: string;
  revenue: number;
  orderCount: number;
}

interface ProductPerformanceMetric {
  listing_id: string;
  productName: string;
  views: number; // Can be estimated or tracked separately
  orders: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
}

interface HealthScore {
  score: number;
  verified: {
    gstin: boolean;
    pan: boolean;
    aadhaar: boolean;
  };
  certification: {
    hasTransparency: number;
    hasCertificates: boolean;
  };
  feedback: {
    averageRating: number;
    totalReviews: number;
  };
  status: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    activeProducts: 0,
    outOfStockProducts: 0,
    pendingOrders: 0,
    averageRating: 0,
    lowStockCount: 0,
    productLowStockCount: 0,
    bundleLowStockCount: 0,
    bundlesLowStock: [],
  });
  const [healthScore, setHealthScore] = useState<HealthScore>({
    score: 0,
    verified: { gstin: false, pan: false, aadhaar: false },
    certification: { hasTransparency: 0, hasCertificates: false },
    feedback: { averageRating: 0, totalReviews: 0 },
    status: "new",
  });
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [sellerEmail, setSellerEmail] = useState<string | null>(null);
  const [sellerName, setSellerName] = useState<string | null>(null);
  const [revenueChange, setRevenueChange] = useState<number | null>(null);
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingWithDetails | null>(null);
  const [restockTarget, setRestockTarget] = useState<{
    productId: string;
    productName: string;
    currentStock: number;
  } | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [timeFilter, setTimeFilter] = useState<string>("monthly");
  const [stockFilter, setStockFilter] = useState<string>("all"); // New: all, instock, lowstock, outofstock
  const [categoryData, setCategoryData] = useState<CategoryRevenue[]>([]);
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<ProductPerformanceMetric[]>([]);
  const [raiseDisputeOpen, setRaiseDisputeOpen] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState<ListingWithDetails[]>([]);
  const [lowStockBundles, setLowStockBundles] = useState<Bundle[]>([]);
  const [restockBundleTarget, setRestockBundleTarget] = useState<{
    bundleId: string;
    bundleName: string;
    currentStock: number;
  } | null>(null);

  const loadListings = useCallback(async (seller_id: string) => {
    const { data, error } = await supabase
      .from("seller_product_listings")
      .select(
        `
        listing_id,
        seller_id,
        seller_title,
        total_stock_quantity,
        base_price,
        status,
        created_at,
        global_products(product_name),
        listing_images(image_url, is_primary)
      `
      )
      .eq("seller_id", seller_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading listings:", error);
      return;
    }

    setListings((data as ListingWithDetails[]) || []);
  }, []);

  const loadLowStockProducts = useCallback(async (seller_id: string) => {
    const { data, error } = await supabase
      .from("seller_product_listings")
      .select(
        `
        listing_id,
        seller_id,
        seller_title,
        total_stock_quantity,
        base_price,
        status,
        created_at,
        global_products(product_name),
        listing_images(image_url, is_primary)
      `
      )
      .eq("seller_id", seller_id)
      .eq("status", "active")
      .lte("total_stock_quantity", 10)
      .gt("total_stock_quantity", 0)
      .order("total_stock_quantity", { ascending: true });

    if (error) {
      console.error("Error loading low stock products:", error);
      return;
    }

    setLowStockProducts((data as ListingWithDetails[]) || []);
  }, []);

  const loadLowStockBundles = useCallback(async (seller_id: string) => {
    const { data, error } = await supabase
      .from("bundles")
      .select(
        `
        bundle_id,
        bundle_name,
        total_stock_quantity,
        base_price,
        discounted_price,
        status,
        created_at,
        bundle_items(
          quantity,
          listing_id,
          seller_product_listings(
            listing_id,
            seller_title,
            total_stock_quantity,
            listing_images(image_url, is_primary)
          )
        )
      `
      )
      .eq("seller_id", seller_id)
      .eq("status", "active")
      .lte("total_stock_quantity", 10)
      .gt("total_stock_quantity", 0)
      .order("total_stock_quantity", { ascending: true });

    if (error) {
      console.error("Error loading low stock bundles:", error);
      return;
    }

    setLowStockBundles((data as Bundle[]) || []);
  }, []);

  const loadBundles = useCallback(async (seller_id: string) => {
    const { data, error } = await supabase
      .from("bundles")
      .select(
        `
        *,
        bundle_items(
          quantity,
          listing_id,
          seller_product_listings(
            listing_id,
            seller_title,
            total_stock_quantity,
            listing_images(image_url, is_primary)
          )
        )
      `
      )
      .eq("seller_id", seller_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading bundles:", error);
      return;
    }

    // Process bundles to calculate total stock
    const processedBundles = data?.map(bundle => ({
      ...bundle,
      total_stock_quantity: bundle.bundle_items?.reduce((total: number, item: { seller_product_listings?: { total_stock_quantity?: number }; quantity: number }) => {
        return total + (item.seller_product_listings?.total_stock_quantity || 0) * item.quantity;
      }, 0) || 0
    })) || [];

    console.log("✅ Loaded bundles:", processedBundles?.length || 0, "bundles", processedBundles);
    setBundles(processedBundles as Bundle[]);
  }, []);

  const loadDashboardData = useCallback(async () => {
    console.log("🔄 Loading dashboard data...");
    setLoading(true);
    try {
      const authSellerId = await getAuthenticatedSellerId();
      if (!authSellerId) {
        console.error("No seller ID found");
        setLoading(false);
        return;
      }

      setSellerId(authSellerId);
      await loadListings(authSellerId);
      await loadLowStockProducts(authSellerId);
      await loadLowStockBundles(authSellerId);
      await loadBundles(authSellerId);

      // Get seller basic info and KYC details
      const { data: seller } = await supabase
        .from("sellers")
        .select("verification_status, gstin_verified, pan_verified, aadhaar_verified, email, business_name, name")
        .eq("id", authSellerId)
        .maybeSingle();

      if (seller) {
        setKycStatus(seller.verification_status);
        setSellerEmail(seller.email || null);
        // schema uses `name` for contact name
        setSellerName(seller.business_name || seller.name || null);
      }

      // Current month revenue - query order_items for this seller
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      const { data: currentMonthItems } = await supabase
        .from("order_items")
        .select("price_per_unit, quantity")
        .eq("seller_id", authSellerId)
        .gte("created_at", startOfMonth);

      const { data: lastMonthItems } = await supabase
        .from("order_items")
        .select("price_per_unit, quantity")
        .eq("seller_id", authSellerId)
        .gte("created_at", startOfLastMonth)
        .lte("created_at", endOfLastMonth);

      const currentRevenue = (currentMonthItems || []).reduce((sum, item) => 
        sum + ((item.price_per_unit || 0) * (item.quantity || 0)), 0);
      
      const lastMonthRevenue = (lastMonthItems || []).reduce((sum, item) => 
        sum + ((item.price_per_unit || 0) * (item.quantity || 0)), 0);

      const revenueChangePercent = lastMonthRevenue === 0 
        ? (currentRevenue > 0 ? 100 : 0)
        : ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

      setRevenueChange(Number(revenueChangePercent.toFixed(1)));

      // Get products
      const { data: activeProducts, count: activeCount } = await supabase
        .from("seller_product_listings")
        .select("listing_id, total_stock_quantity", { count: "exact" })
        .eq("seller_id", authSellerId)
        .eq("status", "active");

      const { count: totalProducts } = await supabase
        .from("seller_product_listings")
        .select("listing_id", { count: "exact" })
        .eq("seller_id", authSellerId);

      const outOfStock = (activeProducts || []).filter(p => p.total_stock_quantity === 0).length;
      
      // Get actual low stock notifications count instead of manual calculation
      const { count: lowStockNotificationsCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .eq("type", "low_stock")
        .eq("is_read", false)
        .eq("related_seller_id", authSellerId);
      
      // Get low stock notifications for products and variants
      const { count: productLowStockCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .eq("type", "low_stock")
        .eq("is_read", false)
        .eq("related_seller_id", authSellerId)
        .not("related_product_id", "is", null)
        .is("related_bundle_id", null);
      
      // Get low stock notifications for bundles
      const { count: bundleLowStockCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .eq("type", "low_stock")
        .eq("is_read", false)
        .eq("related_seller_id", authSellerId)
        .not("related_bundle_id", "is", null);
        
      const lowStock = lowStockNotificationsCount || 0;

      // Get order counts from order_items
      const { count: totalOrdersCount } = await supabase
        .from("order_items")
        .select("order_id", { count: "exact" })
        .eq("seller_id", authSellerId);

      const { count: pendingOrdersCount } = await supabase
        .from("order_items")
        .select("order_id", { count: "exact" })
        .eq("seller_id", authSellerId)
        .eq("status", "pending");

      // Get category revenue
      const { data: allItems } = await supabase
        .from("order_items")
        .select(`
          quantity,
          price_per_unit,
          seller_product_listings(global_products(product_name))
        `)
        .eq("seller_id", authSellerId);

      const categoryMap = new Map<string, CategoryRevenue>();
      interface OrderItemWithListing {
        quantity: number;
        price_per_unit: number;
        seller_product_listings?: { global_products?: { product_name: string } };
      }
      (allItems || []).forEach((item: OrderItemWithListing) => {
        const revenue = (item.price_per_unit || 0) * (item.quantity || 0);
        // For now, group by product_name; category will be added later
        const category = item.seller_product_listings?.global_products?.product_name || "Uncategorized";
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { category, revenue: 0, orderCount: 0 });
        }
        const cat = categoryMap.get(category)!;
        cat.revenue += revenue;
        cat.orderCount += 1;
      });

      const topCategoryData = Array.from(categoryMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setCategoryData(topCategoryData);

      // Get customer reviews for rating and feedback
      let avgRating = 0;
      let totalReviews = 0;
      const { data: sellerReviews } = await supabase
        .from("product_reviews")
        .select("rating, listing_id")
        .in("listing_id", (activeProducts || []).map(p => p.listing_id));

      if (sellerReviews && sellerReviews.length > 0) {
        totalReviews = sellerReviews.length;
        const ratings = sellerReviews.filter(r => r.rating).map(r => r.rating) as number[];
        if (ratings.length > 0) {
          avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        }
      }

      // Get product transparency/certification count
      const { data: transparencies, count: transparencyCount } = await supabase
        .from("product_transparency")
        .select("transparency_id", { count: "exact" })
        .in("listing_id", (activeProducts || []).map(p => p.listing_id) || []);

      // Calculate health score
      const verificationScore = (
        (seller?.gstin_verified ? 1 : 0) +
        (seller?.pan_verified ? 1 : 0) +
        (seller?.aadhaar_verified ? 1 : 0)
      ) * 25;

      const certificationScore = transparencyCount && transparencyCount > 0 ? 20 : 0;
      const feedbackScore = totalReviews > 0 ? Math.min(20, (totalReviews / 10) * 20) : 0;
      const completenessScore = activeProducts?.length ? 20 : 0;

      const totalHealthScore = verificationScore + certificationScore + feedbackScore + completenessScore;

      setHealthScore({
        score: Math.min(100, totalHealthScore),
        verified: {
          gstin: seller?.gstin_verified || false,
          pan: seller?.pan_verified || false,
          aadhaar: seller?.aadhaar_verified || false,
        },
        certification: {
          hasTransparency: transparencyCount || 0,
          hasCertificates: (transparencyCount || 0) > 0,
        },
        feedback: {
          averageRating: avgRating,
          totalReviews,
        },
        status: seller?.verification_status || "pending",
      });

      // Load performance metrics for each product BEFORE setting stats
      const { data: productPerformance } = await supabase
        .from("seller_product_listings")
        .select(`
          listing_id,
          seller_title,
          global_products(product_name)
        `)
        .eq("seller_id", authSellerId);

      interface PerfMetric {
        listing_id: string;
        productName: string;
        views: number;
        orders: number;
        revenue: number;
        averageRating: number;
        reviewCount: number;
      }
      
      const metricsMap = new Map<string, PerfMetric>();
      let totalProductRevenue = 0;
      
      // Get order data for each product
      if (productPerformance) {
        for (const product of productPerformance) {
          const { count: orderCount } = await supabase
            .from("order_items")
            .select("*", { count: "exact", head: true })
            .eq("listing_id", product.listing_id);

          const { data: productOrders } = await supabase
            .from("order_items")
            .select("price_per_unit, quantity")
            .eq("listing_id", product.listing_id);

          const revenue = (productOrders || []).reduce((sum, item) => 
            sum + ((item.price_per_unit || 0) * (item.quantity || 0)), 0);
          
          totalProductRevenue += revenue;

          const { data: reviews } = await supabase
            .from("product_reviews")
            .select("rating")
            .eq("listing_id", product.listing_id);

          let avgProductRating = 0;
          if (reviews && reviews.length > 0) {
            const ratings = reviews.filter(r => r.rating).map(r => r.rating) as number[];
            if (ratings.length > 0) {
              avgProductRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            }
          }

          metricsMap.set(product.listing_id, {
            listing_id: product.listing_id,
            productName: product.seller_title || product.global_products?.product_name || "Product",
            views: (orderCount || 0) * 3, // Estimate: ~3 views per order
            orders: orderCount || 0,
            revenue,
            averageRating: avgProductRating,
            reviewCount: reviews?.length || 0
          });
        }
      }

      // Convert to array and sort by revenue
      const performanceArray = Array.from(metricsMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Top 10 products

      // Get bundles with low stock
      const { data: bundlesData } = await supabase
        .from("bundles")
        .select(`
          bundle_id,
          bundle_name,
          total_stock_quantity,
          bundle_items (
            listing_id,
            seller_product_listings (
              listing_id,
              total_stock_quantity
            )
          )
        `)
        .eq("seller_id", authSellerId)
        .eq("status", "active");

      // Process bundles to find low stock
      const bundlesLowStock: Array<{
        bundle_id: string;
        bundle_name: string;
        total_stock_quantity: number;
        lowStockItems?: string[];
      }> = [];

      if (bundlesData) {
        for (const bundle of bundlesData) {
          const lowStockItems: string[] = [];
          
          // Check if bundle itself is low stock
          if (bundle.total_stock_quantity > 0 && bundle.total_stock_quantity <= 10) {
            // Check items in bundle for low stock
            if (bundle.bundle_items && Array.isArray(bundle.bundle_items)) {
              for (const item of bundle.bundle_items) {
                if (item.seller_product_listings && item.seller_product_listings.total_stock_quantity <= 10) {
                  lowStockItems.push(`Item ${item.listing_id}`);
                }
              }
            }
            
            bundlesLowStock.push({
              bundle_id: bundle.bundle_id,
              bundle_name: bundle.bundle_name,
              total_stock_quantity: bundle.total_stock_quantity,
              lowStockItems: lowStockItems.length > 0 ? lowStockItems : undefined,
            });
          }
        }
      }

      // NOW set stats with actual product revenue sum
      setStats({
        totalRevenue: totalProductRevenue,
        totalOrders: totalOrdersCount || 0,
        totalProducts: totalProducts || 0,
        activeProducts: activeCount || 0,
        outOfStockProducts: outOfStock,
        pendingOrders: pendingOrdersCount || 0,
        averageRating: avgRating,
        lowStockCount: lowStock,
        productLowStockCount: productLowStockCount || 0,
        bundleLowStockCount: bundleLowStockCount || 0,
        bundlesLowStock: bundlesLowStock,
      });

      setPerformanceMetrics(performanceArray);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [loadListings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-yellow-50 border-yellow-200";
    if (score >= 40) return "bg-orange-50 border-orange-200";
    return "bg-red-50 border-red-200";
  };

  // Load dashboard data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const statCards = [
    { title: "Total Revenue", value: `₹${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, description: revenueChange !== null ? `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}% vs last month` : "All time", gradient: "from-green-500 to-emerald-600" },
    { title: "Total Orders", value: stats.totalOrders.toString(), icon: ShoppingCart, description: `${stats.pendingOrders} pending`, gradient: "from-blue-500 to-cyan-600" },
    { title: "Total Products", value: stats.totalProducts.toString(), icon: Package, description: `${stats.activeProducts} active`, gradient: "from-purple-500 to-pink-600" },
    { title: "Pending Orders", value: stats.pendingOrders.toString(), icon: Clock, description: "Ready to process", gradient: "from-orange-500 to-red-600" },
    { title: "Out of Stock", value: stats.outOfStockProducts.toString(), icon: AlertCircle, description: `${stats.lowStockCount} low`, gradient: "from-red-500 to-pink-600" },
    { title: "Avg Rating", value: `${stats.averageRating.toFixed(1)}★`, icon: Star, description: "Seller rating", gradient: "from-yellow-500 to-orange-600" },
  ];

  if (loading && !sellerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SellerRaiseDispute
        isOpen={raiseDisputeOpen}
        onClose={() => setRaiseDisputeOpen(false)}
        sellerId={sellerId || ""}
        context={{
          type: "platform",
        }}
      />
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Seller Dashboard</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setRaiseDisputeOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Flag className="h-4 w-4" />
              Raise Dispute
            </Button>
            <Button onClick={handleRefresh} disabled={refreshing} size="lg" variant="outline" className="gap-2">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

      {/* Test Email Component - Hidden for production */}
      {/* <TestEmailButton 
        sellerEmail={sellerEmail || undefined}
        sellerName={sellerName || undefined}
        sellerId={sellerId || undefined}
      /> */}

      {kycStatus !== "verified" && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">
            {kycStatus === "pending" ? "KYC Verification Pending" : 
             kycStatus === "new_user" ? "Welcome New User - Complete Your KYC" :
             "KYC Verification Status"}
          </AlertTitle>
          <AlertDescription className="text-yellow-700">
            {kycStatus === "pending" ? "Your KYC is under review. This may take 24-48 hours." :
             kycStatus === "new_user" ? "Complete your KYC verification to start selling and unlock all features." :
             "Complete your KYC verification to unlock all features"}
          </AlertDescription>
        </Alert>
      )}

      {kycStatus === "verified" && (
        <Alert className="border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">KYC Verified</AlertTitle>
          <AlertDescription className="text-green-700">Your account is verified and all features are unlocked.</AlertDescription>
        </Alert>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">{card.title}</CardTitle>
                <div className={`bg-gradient-to-br ${card.gradient} p-2 rounded-lg`}>
                  <Icon className="h-3 w-3 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Health Score Card */}
      <Card className={`border ${getHealthScoreBg(healthScore.score)}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={`h-6 w-6 ${getHealthScoreColor(healthScore.score)}`} />
              <CardTitle>Seller Health Score</CardTitle>
            </div>
            <div className="text-3xl font-bold">{healthScore.score.toFixed(0)}/100</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all ${
                healthScore.score >= 80 ? 'bg-green-600' : 
                healthScore.score >= 60 ? 'bg-yellow-600' : 
                healthScore.score >= 40 ? 'bg-orange-600' : 
                'bg-red-600'
              }`}
              style={{ width: `${Math.min(100, healthScore.score)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Verification</p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${healthScore.verified.gstin ? 'bg-green-600' : 'bg-gray-300'}`} />
                  <span className="text-xs">GSTIN</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${healthScore.verified.pan ? 'bg-green-600' : 'bg-gray-300'}`} />
                  <span className="text-xs">PAN</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${healthScore.verified.aadhaar ? 'bg-green-600' : 'bg-gray-300'}`} />
                  <span className="text-xs">Aadhaar</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600">Certification</p>
              <p className="text-2xl font-bold mt-2">{healthScore.certification.hasTransparency}</p>
              <p className="text-xs text-gray-500">Products certified</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600">Customer Feedback</p>
              <p className="text-2xl font-bold mt-2">{healthScore.feedback.averageRating.toFixed(1)}★</p>
              <p className="text-xs text-gray-500">{healthScore.feedback.totalReviews} reviews</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <Badge className="mt-2">{healthScore.status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FSSAI Expiry Notifications */}
      <FSSAIExpiryNotifications />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {!sellerId ? <div className="text-center py-8"><p className="text-muted-foreground">Loading...</p></div> : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Sales & Profit Trend</CardTitle></CardHeader>
                  <CardContent><SellerGraph sellerId={sellerId} /></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Top & Bottom Sellers</CardTitle></CardHeader>
                  <CardContent><BestWorstSelling sellerId={sellerId} /></CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-orange-600" />Low Stock Alerts ({stats.lowStockCount})</CardTitle></CardHeader>
                <CardContent><LowStockNotifications showRestockButton={false} /></CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-600" />Bundle Low Stock ({stats.bundleLowStockCount})</CardTitle></CardHeader>
                <CardContent><LowStockNotificationsBundle showRestockButton={false} /></CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {!sellerId ? <div className="text-center py-8"><p className="text-muted-foreground">Loading...</p></div> : (
            <>
              <ProductAnalytics sellerId={sellerId} />

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <CardTitle>Revenue by Category</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <div className="space-y-4">
                      {categoryData.map((cat, idx) => {
                        const total = categoryData.reduce((s, c) => s + c.revenue, 0);
                        const pct = total > 0 ? (cat.revenue / total) * 100 : 0;
                        return (
                          <div key={idx}>
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <p className="font-medium">{cat.category}</p>
                                <p className="text-xs text-gray-500">{cat.orderCount} orders</p>
                              </div>
                              <span className="text-sm font-bold">₹{cat.revenue.toFixed(0)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                              <div 
                                className="bg-blue-600 h-2 rounded transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{pct.toFixed(1)}% of total</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="text-muted-foreground text-center py-4">No sales data available yet</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <CardTitle>Product Performance Metrics</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {performanceMetrics.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 font-semibold">Product Name</th>
                            <th className="text-right py-3 px-2 font-semibold">Views</th>
                            <th className="text-right py-3 px-2 font-semibold">Orders</th>
                            <th className="text-right py-3 px-2 font-semibold">Revenue</th>
                            <th className="text-center py-3 px-2 font-semibold">Rating</th>
                            <th className="text-right py-3 px-2 font-semibold">Reviews</th>
                          </tr>
                        </thead>
                        <tbody>
                          {performanceMetrics.map((metric) => (
                            <tr key={metric.listing_id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-2 font-medium truncate">{metric.productName}</td>
                              <td className="text-right py-3 px-2 text-gray-600">{metric.views}</td>
                              <td className="text-right py-3 px-2 text-gray-600">{metric.orders}</td>
                              <td className="text-right py-3 px-2 font-semibold text-green-600">₹{metric.revenue.toFixed(0)}</td>
                              <td className="text-center py-3 px-2">
                                {metric.averageRating > 0 ? (
                                  <span className="text-yellow-600 font-medium">{metric.averageRating.toFixed(1)}★</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="text-right py-3 px-2 text-gray-600">{metric.reviewCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No product performance data available yet</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          {!sellerId ? <div className="text-center py-8"><p className="text-muted-foreground">Loading...</p></div> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categoryData.map((cat) => (
                        <SelectItem key={cat.category} value={cat.category}>{cat.category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Price Range</label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Min" value={priceRange[0]} onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])} className="w-1/2" />
                    <Input type="number" placeholder="Max" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])} className="w-1/2" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Stock Status</label>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="instock">In Stock</SelectItem>
                      <SelectItem value="lowstock">Low Stock (≤10)</SelectItem>
                      <SelectItem value="outofstock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalProducts}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{stats.activeProducts}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Out of Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{stats.outOfStockProducts}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Low Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</p></CardContent></Card>
              </div>

              {/* Product Grid with Restock */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    My Products & Bundles
                    <Badge variant="outline" className="ml-2">
                      Filter: {stockFilter === "all" ? "All Items" : 
                               stockFilter === "instock" ? "In Stock (>10)" : 
                               stockFilter === "lowstock" ? "Low Stock (1-10)" : 
                               stockFilter === "outofstock" ? "Out of Stock (0)" : stockFilter}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {listings.length === 0 && bundles.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No products or bundles found</p>
                  ) : (
                    <>
                      {/* Debug Info */}
                      <div className="text-xs text-gray-500 mb-4 flex gap-4">
                        <span>Products: {listings.length}</span>
                        <span>Bundles: {bundles.length}</span>
                        <span>Active Bundles: {bundles.filter(b => b.status === "active" || !b.status).length}</span>
                        <span>Filter: {stockFilter}</span>
                      </div>
                      
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {listings
                        .filter(l => l.status === "active")
                        .filter(l => {
                          // Category filter
                          if (categoryFilter !== "all") {
                            const productCategory = l.global_products?.product_name || "Uncategorized";
                            if (productCategory !== categoryFilter) return false;
                          }
                          
                          // Price filter
                          if (l.base_price < priceRange[0] || l.base_price > priceRange[1]) return false;
                          
                          // Stock filter logic:
                          if (stockFilter === "instock" && l.total_stock_quantity <= 10) return false;
                          if (stockFilter === "lowstock" && (l.total_stock_quantity <= 0 || l.total_stock_quantity > 10)) return false;
                          if (stockFilter === "outofstock" && l.total_stock_quantity !== 0) return false;
                          
                          return true;
                        })
                        .map((listing: ListingWithDetails) => {
                        const isLowStock = listing.total_stock_quantity <= 10 && listing.total_stock_quantity > 0;
                        const isOutOfStock = listing.total_stock_quantity === 0;
                        
                        return (
                        <div key={listing.listing_id} className={`border rounded-lg overflow-hidden hover:shadow-lg transition ${
                          isLowStock ? 'border-orange-300 bg-orange-50' : 
                          isOutOfStock ? 'border-red-300 bg-red-50' : 
                          'border-gray-200'
                        }`}>
                          {/* Low Stock Badge */}
                          {isLowStock && (
                            <div className="bg-orange-600 text-white text-xs px-2 py-1 text-center">
                              ⚠️ LOW STOCK - RESTOCK NEEDED
                            </div>
                          )}
                          {isOutOfStock && (
                            <div className="bg-red-600 text-white text-xs px-2 py-1 text-center">
                              ❌ OUT OF STOCK
                            </div>
                          )}
                          {/* Product Image */}
                          <div className="bg-gray-100 aspect-square flex items-center justify-center">
                            {listing.listing_images?.[0]?.image_url ? (
                              <img 
                                src={listing.listing_images[0].image_url} 
                                alt={listing.seller_title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                          {/* Product Info */}
                          <div className="p-3">
                            <div className="flex items-center gap-1 mb-1">
                              <Package className="h-3 w-3 text-gray-500" />
                              <span className="text-xs text-gray-500">Product</span>
                            </div>
                            <h3 className="font-medium text-sm truncate">{listing.seller_title}</h3>
                            <p className="text-xs text-muted-foreground mb-2">
                              {listing.global_products?.product_name}
                            </p>
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-green-600">₹{listing.base_price}</span>
                              <span className={`text-xs font-medium ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-600'}`}>
                                {listing.total_stock_quantity} stock
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              className={`w-full text-xs ${
                                isLowStock ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                                isOutOfStock ? 'bg-red-600 hover:bg-red-700 text-white' :
                                'bg-gray-600 hover:bg-gray-700 text-white'
                              }`}
                              onClick={() => {
                                setRestockTarget({
                                  productId: listing.listing_id,
                                  productName: listing.seller_title || listing.global_products?.product_name,
                                  currentStock: listing.total_stock_quantity,
                                });
                              }}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              {isLowStock ? 'RESTOCK NOW!' : isOutOfStock ? 'URGENT RESTOCK' : 'Restock'}
                            </Button>
                          </div>
                        </div>
                        );
                      })}
                      
                      {/* Bundles */}
                      {bundles
                        .filter(b => b.status === "active")
                        .filter(b => {
                          // Stock filter logic for bundles:
                          if (stockFilter === "instock" && b.total_stock_quantity <= 10) return false;
                          if (stockFilter === "lowstock" && (b.total_stock_quantity <= 0 || b.total_stock_quantity > 10)) return false;
                          if (stockFilter === "outofstock" && b.total_stock_quantity > 0) return false;
                          
                          return true;
                        })
                        .map((bundle: Bundle) => {
                        const isLowStock = bundle.total_stock_quantity <= 10 && bundle.total_stock_quantity > 0;
                        const isOutOfStock = bundle.total_stock_quantity === 0;
                        
                        return (
                        <div key={bundle.bundle_id} className={`border rounded-lg overflow-hidden hover:shadow-lg transition ${
                          isLowStock ? 'border-orange-300 bg-orange-50' : 
                          isOutOfStock ? 'border-red-300 bg-red-50' : 
                          'border-gray-200'
                        }`}>
                          {/* Low Stock Badge */}
                          {isLowStock && (
                            <div className="bg-orange-600 text-white text-xs px-2 py-1 text-center">
                              ⚠️ BUNDLE LOW STOCK - RESTOCK NEEDED
                            </div>
                          )}
                          {isOutOfStock && (
                            <div className="bg-red-600 text-white text-xs px-2 py-1 text-center">
                              ❌ BUNDLE OUT OF STOCK
                            </div>
                          )}
                          {/* Bundle Image */}
                          <div className="bg-gray-100 aspect-square flex items-center justify-center">
                            {bundle.bundle_items?.[0]?.seller_product_listings?.listing_images?.[0]?.image_url ? (
                              <img 
                                src={bundle.bundle_items[0].seller_product_listings.listing_images[0].image_url} 
                                alt={bundle.bundle_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                          {/* Bundle Info */}
                          <div className="p-3">
                            <div className="flex items-center gap-1 mb-1">
                              <Package className="h-3 w-3 text-blue-500" />
                              <span className="text-xs text-blue-500 font-medium">Bundle</span>
                            </div>
                            <h3 className="font-medium text-sm truncate">{bundle.bundle_name}</h3>
                            <p className="text-xs text-muted-foreground mb-2">
                              {bundle.bundle_items?.length || 0} items
                            </p>
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-green-600">₹{bundle.discounted_price || bundle.base_price}</span>
                              <span className={`text-xs font-medium ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-600'}`}>
                                {bundle.total_stock_quantity} stock
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              className={`w-full text-xs ${
                                isLowStock ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                                isOutOfStock ? 'bg-red-600 hover:bg-red-700 text-white' :
                                'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                              onClick={() => {
                                setRestockBundleTarget({
                                  bundleId: bundle.bundle_id,
                                  bundleName: bundle.bundle_name,
                                  currentStock: bundle.total_stock_quantity,
                                });
                              }}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              {isLowStock ? 'RESTOCK BUNDLE NOW!' : isOutOfStock ? 'URGENT BUNDLE RESTOCK' : 'Restock Bundle'}
                            </Button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <SimpleRestockDialog
                open={!!restockTarget}
                onOpenChange={(open) => !open && setRestockTarget(null)}
                productId={restockTarget?.productId || ""}
                productName={restockTarget?.productName || ""}
                currentStock={restockTarget?.currentStock || 0}
                isVariant={false}
                sellerId={sellerId}
                onSuccess={() => {
                  if (sellerId) {
                    loadDashboardData();
                    loadLowStockProducts(sellerId);
                    loadListings(sellerId);
                  }
                  setRestockTarget(null);
                }}
              />

              <SimpleRestockDialog
                open={!!restockBundleTarget}
                onOpenChange={(open) => !open && setRestockBundleTarget(null)}
                productId={restockBundleTarget?.bundleId || ""}
                productName={restockBundleTarget?.bundleName || ""}
                currentStock={restockBundleTarget?.currentStock || 0}
                isBundle={true}
                sellerId={sellerId}
                onSuccess={() => {
                  if (sellerId) {
                    loadDashboardData();
                    loadLowStockBundles(sellerId);
                    loadBundles(sellerId);
                  }
                  setRestockBundleTarget(null);
                }}
              />
            </>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex gap-4 items-center">
            <Select value={orderFilter} onValueChange={setOrderFilter}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!sellerId ? <div className="text-center py-8"><p className="text-muted-foreground">Loading...</p></div> : <SellerOrders sellerId={sellerId} limit={50} statusFilter={orderFilter} />}
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}
