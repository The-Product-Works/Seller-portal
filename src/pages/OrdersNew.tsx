import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Package, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  RotateCcw, 
  ExternalLink, 
  MapPin, 
  DollarSign, 
  History, 
  RefreshCw, 
  CheckCircle, 
  Eye, 
  Calendar,
  X
} from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import type { 
  OrderWithDetails, 
  OrderFilters, 
  OrderStatus, 
  ReturnStatus, 
  DateFilter,
  OrderSummary,
  RawOrderDataFromDB 
} from "@/types/order.types";

export default function Orders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // Enhanced filters state
  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    status: "all",
    returnStatus: "all", 
    dateFilter: "last_30_days",
    startDate: "",
    endDate: ""
  });

  useEffect(() => {
    loadOrders(1);
  }, [filters, loadOrders]);

  useEffect(() => {
    const initSellerId = async () => {
      const id = await getAuthenticatedSellerId();
      setSellerId(id);
    };
    initSellerId();
  }, []);

  const loadOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const id = await getAuthenticatedSellerId();
      if (!id) {
        toast({
          title: "Not authenticated",
          description: "Please log in to view orders",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      let query = supabase
        .from("orders")
        .select(`
          order_id,
          created_at,
          status,
          total_amount,
          final_amount,
          buyer_id,
          users!orders_buyer_id_fkey (
            email,
            phone,
            user_profiles (
              full_name
            )
          ),
          order_items (
            quantity,
            seller_product_listings (
              seller_title
            ),
            listing_variants (
              variant_name,
              sku,
              batch_number
            )
          ),
          order_returns (
            status,
            return_id
          )
        `, { count: "exact" })
        .eq("seller_id", id);

      // Apply status filter
      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      // Apply date filter
      if (filters.dateFilter !== "custom") {
        const now = new Date();
        let startDate: Date;
        
        switch (filters.dateFilter) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "last_7_days":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "last_30_days":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "this_month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "last_month": {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            query = query.gte("created_at", lastMonth.toISOString());
            query = query.lte("created_at", lastMonthEnd.toISOString());
            break;
          }
        }
        if (filters.dateFilter !== "last_month") {
          query = query.gte("created_at", startDate.toISOString());
        }
      } else if (filters.startDate && filters.endDate) {
        query = query.gte("created_at", filters.startDate);
        query = query.lte("created_at", filters.endDate);
      }

      // Apply search filter (only for order_id at database level)
      if (filters.search.trim() && /^[a-zA-Z0-9-]+$/.test(filters.search)) {
        // Only search by order_id if it looks like an order ID
        query = query.ilike("order_id", `%${filters.search}%`);
      }

      // Get total count
      const { count: totalCount } = await query;
      setTotalOrders(totalCount || 0);

      // Get paginated data
      const offset = (page - 1) * ordersPerPage;
      const { data: ordersData, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + ordersPerPage - 1);

      if (error) {
        console.error("Error fetching orders:", error);
        toast({
          title: "Error",
          description: "Failed to load orders: " + error.message,
          variant: "destructive",
        });
        return;
      }

      // Transform data to OrderSummary format
      const transformedOrders: OrderSummary[] = (ordersData || []).map((order: RawOrderDataFromDB) => {
        // Calculate return status
        let returnStatus: ReturnStatus = "NA";
        if (order.order_returns && order.order_returns.length > 0) {
          const latestReturn = order.order_returns[0];
          switch (latestReturn.status) {
            case "initiated":
              returnStatus = "return_requested";
              break;
            case "approved":
              returnStatus = "return_approved";
              break;
            case "rejected":
              returnStatus = "return_rejected";
              break;
            case "in_transit":
              returnStatus = "in_return_transit";
              break;
            case "under_qc":
              returnStatus = "under_qc";
              break;
            case "refund_initiated":
              returnStatus = "refund_initiated";
              break;
            case "qc_failed":
              returnStatus = "qc_failed";
              break;
            case "closed":
              returnStatus = "return_closed";
              break;
            default:
              returnStatus = "NA";
          }
        }

        // Get product details
        const firstItem = order.order_items?.[0];
        let productVariant = "Unknown Product";
        let quantity = 0;

        if (firstItem) {
          const productTitle = firstItem.seller_product_listings?.seller_title || "Unknown Product";
          const variantName = firstItem.listing_variants?.variant_name;
          productVariant = variantName ? `${productTitle} - ${variantName}` : productTitle;
          quantity = order.order_items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
        }

        return {
          order_id: order.order_id,
          date: order.created_at,
          product_variant: productVariant,
          quantity: quantity,
          batch: firstItem?.listing_variants?.batch_number || firstItem?.listing_variants?.sku || "N/A",
          value: order.final_amount || order.total_amount,
          status: order.status as OrderStatus,
          return_status: returnStatus,
          customer_name: order.users?.user_profiles?.[0]?.full_name || "Unknown Customer",
          customer_email: order.users?.email || null
        };
      });

      setOrders(transformedOrders);

      // Apply frontend search filter for product names
      let filteredOrders = transformedOrders;
      if (filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase();
        filteredOrders = transformedOrders.filter(order => 
          order.order_id.toLowerCase().includes(searchTerm) ||
          order.product_variant.toLowerCase().includes(searchTerm) ||
          order.customer_name.toLowerCase().includes(searchTerm)
        );
      }

      setOrders(filteredOrders);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast({
        title: "Error", 
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const handleFilterChange = (key: keyof OrderFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "all",
      returnStatus: "all",
      dateFilter: "last_30_days",
      startDate: "",
      endDate: ""
    });
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      new_order: { variant: "secondary" as const, icon: Clock },
      packed: { variant: "outline" as const, icon: Package },
      shipped: { variant: "default" as const, icon: Truck },
      in_transit: { variant: "default" as const, icon: Truck },
      delivered: { variant: "default" as const, icon: CheckCircle2 },
      cancelled: { variant: "destructive" as const, icon: X }
    };

    const config = statusConfig[status] || { variant: "secondary" as const, icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getReturnStatusBadge = (status: ReturnStatus) => {
    if (status === "NA") return <Badge variant="outline">NA</Badge>;
    
    const statusConfig = {
      return_requested: { variant: "secondary" as const, label: "Requested" },
      return_approved: { variant: "default" as const, label: "Approved" },
      return_rejected: { variant: "destructive" as const, label: "Rejected" },
      in_return_transit: { variant: "outline" as const, label: "In Transit" },
      under_qc: { variant: "secondary" as const, label: "Under QC" },
      refund_initiated: { variant: "default" as const, label: "Refund Initiated" },
      qc_failed: { variant: "destructive" as const, label: "QC Failed" },
      return_closed: { variant: "outline" as const, label: "Closed" }
    };

    const config = statusConfig[status] || { variant: "secondary" as const, label: status };

    return (
      <Badge variant={config.variant}>{config.label}</Badge>
    );
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-10 bg-muted rounded animate-pulse mb-6" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Orders</h1>
          <p className="text-muted-foreground">Manage and track all your customer orders</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div>
              <Label htmlFor="search" className="text-sm font-medium mb-2 block">
                Search Orders
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by Order ID or Product name..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new_order">New Order</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Return Status Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Return Status</Label>
                <Select value={filters.returnStatus} onValueChange={(value) => handleFilterChange("returnStatus", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Returns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Returns</SelectItem>
                    <SelectItem value="NA">NA</SelectItem>
                    <SelectItem value="return_requested">Return Requested</SelectItem>
                    <SelectItem value="return_approved">Return Approved</SelectItem>
                    <SelectItem value="return_rejected">Return Rejected</SelectItem>
                    <SelectItem value="in_return_transit">In Return Transit</SelectItem>
                    <SelectItem value="under_qc">Under QC</SelectItem>
                    <SelectItem value="refund_initiated">Refund Initiated</SelectItem>
                    <SelectItem value="qc_failed">QC Failed</SelectItem>
                    <SelectItem value="return_closed">Return Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Date</Label>
                <Select value={filters.dateFilter} onValueChange={(value) => handleFilterChange("dateFilter", value as DateFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Custom Date Range */}
            {filters.dateFilter === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date" className="text-sm font-medium mb-2 block">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-sm font-medium mb-2 block">
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Showing {orders.length} of {totalOrders} orders
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Product + Variant</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Return Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.order_id}>
                    <TableCell className="font-medium">
                      #{order.order_id.slice(-8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      {new Date(order.date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short"
                      })}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {order.product_variant}
                    </TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{order.batch}</TableCell>
                    <TableCell>₹{order.value.toLocaleString()}</TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      {getReturnStatusBadge(order.return_status)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewOrder(order.order_id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalOrders > ordersPerPage && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(totalOrders / ordersPerPage)}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadOrders(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadOrders(currentPage + 1)}
                    disabled={currentPage === Math.ceil(totalOrders / ordersPerPage) || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}