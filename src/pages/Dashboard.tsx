import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SellerGraph } from "@/components/SellerGraph";
import { DashboardProductStock } from "@/components/DashboardProductStock";
import { SellerOrders } from "@/components/SellerOrders";
import { BestWorstSelling } from "@/components/BestWorstSelling";
import { HealthScoreDashboard } from "@/components/HealthScoreDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, Package, ShoppingCart, TrendingUp, AlertCircle, Clock, 
  RefreshCw, Plus, Filter 
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

      const { data: revenueNow } = await supabase
        .from("orders")
        .select("total_amount", { count: "exact", head: false })
        .eq("seller_id", user.id)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      let totalRevenue = 0;
      if (revenueNow && Array.isArray(revenueNow)) {
        totalRevenue = revenueNow.reduce((s: number, r: OrderRecord) => s + (r.total_amount || 0), 0);
      }

      const now = new Date();
      const startCurrent = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startPrev = new Date(startCurrent.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { data: prevPeriod } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("seller_id", user.id)
        .gte("created_at", startPrev.toISOString())
        .lt("created_at", startCurrent.toISOString());

      const prevRevenue = (prevPeriod || []).reduce((s: number, r: OrderRecord) => s + (r.total_amount || 0), 0);
      const change = prevRevenue === 0 ? (totalRevenue === 0 ? 0 : 100) : ((totalRevenue - prevRevenue) / prevRevenue) * 100;
      setRevenueChange(Number(change.toFixed(1)));

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

      const { count: totalOrdersCount } = await supabase
        .from("orders")
        .select("id", { count: "exact" })
        .eq("seller_id", user.id);

      const { count: pendingOrdersCount } = await supabase
        .from("orders")
        .select("id", { count: "exact" })
        .eq("seller_id", user.id)
        .eq("status", "pending");

      setStats({
        totalRevenue: totalRevenue,
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
      description: revenueChange !== null ? `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}% from last month` : "Total earnings",
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
      title: "Health Score",
      value: "Soon",
      icon: TrendingUp,
      description: "Seller performance metric",
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
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
            <TrendingUp className="h-4 w-4" />
            Health
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
                <CardTitle>Best & Worst Selling</CardTitle>
              </CardHeader>
              <CardContent>
                <BestWorstSelling sellerId={sellerId} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <LowStockNotifications />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Product Management</h2>
            <Button onClick={() => setShowRestockDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Restock Product
            </Button>
          </div>

          <DashboardProductStock sellerId={sellerId} limit={50} />
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
          <HealthScoreDashboard sellerId={sellerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
