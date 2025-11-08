import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SellerGraph } from "@/components/SellerGraph";
import { DashboardProductStock } from "@/components/DashboardProductStock";
import { SellerOrders } from "@/components/SellerOrders";
import { BestWorstSelling } from "@/components/BestWorstSelling";
import { AdvancedHealthScoreDashboard } from "@/components/AdvancedHealthScoreDashboard";
import { ProductAnalytics } from "@/components/ProductAnalytics";
import { ProductGalleryGrid } from "@/components/ProductGalleryGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, Package, ShoppingCart, TrendingUp, AlertCircle, Clock, 
  RefreshCw, Plus, Filter, BarChart3, Heart, Award, Activity
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LowStockNotifications } from "@/components/LowStockNotifications";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import RestockDialog from "@/components/RestockDialog";

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  pendingOrders: number;
}

interface OrderRecord {
  total_amount: number;
}

interface Seller {
  id: string;
  verification_status: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    activeProducts: 0,
    draftProducts: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [revenueChange, setRevenueChange] = useState<number | null>(null);
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: seller } = await supabase
        .from("sellers")
        .select("id, verification_status")
        .eq("user_id", user.id)
        .single();

      if (!seller) {
        setLoading(false);
        return;
      }

      const sellerData = seller as Seller;
      setKycStatus(sellerData.verification_status);
      setSellerId(sellerData.id);

      // Calculate current month revenue (from orders table, excluding cancelled/refunded)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const { data: currentMonthOrders } = await supabase
        .from("orders")
        .select("total_amount, final_amount")
        .eq("seller_id", sellerData.id)
        .neq("status", "cancelled")
        .neq("status", "refunded")
        .gte("created_at", startOfMonth.toISOString());

      const { data: lastMonthOrders } = await supabase
        .from("orders")
        .select("total_amount, final_amount")
        .eq("seller_id", sellerData.id)
        .neq("status", "cancelled")
        .neq("status", "refunded")
        .gte("created_at", startOfLastMonth.toISOString())
        .lte("created_at", endOfLastMonth.toISOString());

      // Calculate current month revenue
      const currentRevenue = currentMonthOrders?.reduce((sum, order) => 
        sum + (order.final_amount || order.total_amount), 0) || 0;
      
      // Calculate last month revenue  
      const lastMonthRevenue = lastMonthOrders?.reduce((sum, order) => 
        sum + (order.final_amount || order.total_amount), 0) || 0;

      // Calculate percentage change
      const revenueChangePercent = lastMonthRevenue === 0 
        ? (currentRevenue > 0 ? 100 : 0)
        : ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

      setRevenueChange(Number(revenueChangePercent.toFixed(1)));

      // Get product counts using seller_id from sellers table
      const { count: activeCount } = await supabase
        .from("seller_product_listings")
        .select("listing_id", { count: "exact" })
        .eq("seller_id", sellerData.id)
        .eq("status", "active");

      const { count: draftCount } = await supabase
        .from("seller_product_listings")
        .select("listing_id", { count: "exact" })
        .eq("seller_id", sellerData.id)
        .eq("status", "draft");

      // Get order counts using seller_id
      const { count: totalOrdersCount } = await supabase
        .from("orders")
        .select("order_id", { count: "exact" })
        .eq("seller_id", sellerData.id);

      const { count: pendingOrdersCount } = await supabase
        .from("orders")
        .select("order_id", { count: "exact" })
        .eq("seller_id", sellerData.id)
        .eq("status", "pending");

      setStats({
        totalRevenue: currentRevenue,
        totalOrders: totalOrdersCount || 0,
        totalProducts: (activeCount || 0) + (draftCount || 0),
        activeProducts: activeCount || 0,
        draftProducts: draftCount || 0,
        pendingOrders: pendingOrdersCount || 0,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      description: revenueChange !== null ? `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}% from last month` : "This month earnings",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      description: `${stats.pendingOrders} pending`,
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      title: "All Products",
      value: stats.totalProducts.toString(),
      icon: Package,
      description: `${stats.activeProducts} active, ${stats.draftProducts} draft`,
      gradient: "from-purple-500 to-pink-600",
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders.toString(),
      icon: Clock,
      description: "Awaiting processing",
      gradient: "from-orange-500 to-red-600",
    },
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
    <div className="space-y-6 p-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Seller Dashboard</h1>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          size="lg"
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KYC Alert */}
      {kycStatus !== "verified" && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">KYC Verification Pending</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Complete your KYC verification to unlock all seller features
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`bg-gradient-to-br ${card.gradient} p-2 rounded-lg`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Health Score
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {!sellerId ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading dashboard data...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SellerGraph sellerId={sellerId} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Performance Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BestWorstSelling sellerId={sellerId} />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      Low Stock Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LowStockNotifications />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{stats.activeProducts}</p>
                        <p className="text-sm text-green-700">Active Products</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{stats.draftProducts}</p>
                        <p className="text-sm text-blue-700">Draft Products</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">₹{stats.totalRevenue.toFixed(0)}</p>
                        <p className="text-sm text-purple-700">Total Revenue</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">{stats.pendingOrders}</p>
                        <p className="text-sm text-orange-700">Pending Orders</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {!sellerId ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : (
            <ProductAnalytics sellerId={sellerId} />
          )}
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">All Products & Bundles</h2>
          </div>

          {!sellerId ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : (
            <ProductGalleryGrid sellerId={sellerId} limit={50} showOnlyOutOfStock={true} />
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 max-w-xs">
              <Select value={orderFilter} onValueChange={setOrderFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="return_requested">Return Requested</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Showing {orderFilter === 'all' ? 'all' : orderFilter} orders
            </p>
          </div>

          <SellerOrders sellerId={sellerId} limit={50} statusFilter={orderFilter} />
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health">
          {!sellerId ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading health metrics...</p>
            </div>
          ) : (
            <AdvancedHealthScoreDashboard sellerId={sellerId} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
