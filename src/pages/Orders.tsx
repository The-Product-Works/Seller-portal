import { useState, useEffect } from "react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Package, Search, Filter, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";

interface OrderItemWithRelations {
  order_item_id: string;
  listing_id: string;
  variant_id: string | null;
  quantity: number;
  price_per_unit: number;
  subtotal: number | null;
  status: string | null;
  seller_product_listings: {
    seller_title: string;
  };
  listing_variants: {
    variant_name: string;
  } | null;
}

interface OrderItem {
  order_item_id: string;
  listing_id: string;
  variant_id: string | null;
  quantity: number;
  price_per_unit: number;
  subtotal: number | null;
  status: string | null;
  product_title?: string;
  variant_name?: string;
}

interface Order {
  order_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  total_amount: number;
  discount_amount: number | null;
  shipping_cost: number | null;
  final_amount: number | null;
  payment_status: string | null;
  created_at: string;
  updated_at: string | null;
  address_id: string | null;
  items?: OrderItem[];
}

interface OrderDetail extends Order {
  buyer_name?: string;
  buyer_email?: string;
  item_count?: number;
  status_badge_variant: "default" | "secondary" | "destructive" | "outline";
}

export default function Orders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "processing" | "delivered" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("order_id", orderId)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to cancel order: " + error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Order cancelled successfully",
      });

      // Reload orders
      loadOrders();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const loadOrders = async () => {
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

      setSellerId(id);

      // Fetch orders for the seller
      const query = supabase
        .from("orders")
        .select(
          `
          order_id,
          buyer_id,
          seller_id,
          status,
          total_amount,
          discount_amount,
          shipping_cost,
          final_amount,
          payment_status,
          created_at,
          updated_at,
          address_id
        `
        )
        .eq("seller_id", id)
        .order("created_at", { ascending: false });

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        toast({
          title: "Error",
          description: "Failed to load orders: " + ordersError.message,
          variant: "destructive",
        });
        return;
      }

      // Fetch order items for all orders
      const orderIds = (ordersData || []).map((o) => o.order_id);
      let orderItemsData: OrderItem[] = [];

      if (orderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from("order_items")
          .select(
            `
            order_item_id,
            listing_id,
            variant_id,
            quantity,
            price_per_unit,
            subtotal,
            status,
            seller_product_listings(seller_title),
            listing_variants(variant_name)
          `
          )
          .in("order_id", orderIds);

        if (itemsError) {
          console.error("Error fetching order items:", itemsError);
        } else {
          orderItemsData = (items || []).map((item: OrderItemWithRelations) => ({
            order_item_id: item.order_item_id,
            listing_id: item.listing_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            price_per_unit: item.price_per_unit,
            subtotal: item.subtotal,
            status: item.status,
            product_title: item.seller_product_listings?.seller_title || "Unknown Product",
            variant_name: item.listing_variants?.variant_name,
          }));
        }
      }

      // Map orders with items and format for display
      const formattedOrders: OrderDetail[] = (ordersData || []).map((order) => {
        const items = orderItemsData.filter((item) => item.listing_id);
        const statusBadgeVariant = getStatusBadgeVariant(order.status);

        return {
          ...order,
          items: items,
          item_count: items.length,
          status_badge_variant: statusBadgeVariant,
        };
      });

      setOrders(formattedOrders);
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
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "delivered":
        return "default";
      case "processing":
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "delivered":
        return <CheckCircle2 className="h-4 w-4" />;
      case "processing":
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  // Filter and search orders
  const filteredOrders = orders.filter((order) => {
    if (filter !== "all" && order.status?.toLowerCase() !== filter) {
      return false;
    }
    if (
      searchQuery &&
      !order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !order.buyer_id.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status?.toLowerCase() === "pending").length,
    processing: orders.filter((o) => o.status?.toLowerCase() === "processing").length,
    delivered: orders.filter((o) => o.status?.toLowerCase() === "delivered").length,
    cancelled: orders.filter((o) => o.status?.toLowerCase() === "cancelled").length,
  };

  const totalRevenue = orders.reduce((sum, order) => sum + (order.final_amount || order.total_amount), 0);

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">
                  Search orders
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by Order ID or Buyer ID..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full md:w-48">
                <Label htmlFor="status-filter" className="sr-only">
                  Filter by status
                </Label>
                <Select value={filter} onValueChange={(value: string) => setFilter(value as "all" | "pending" | "processing" | "delivered" | "cancelled")}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={loadOrders} variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No orders found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.order_id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold">Order #{order.order_id.substring(0, 8).toUpperCase()}</p>
                        <Badge variant={order.status_badge_variant} className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                        <div>
                          <p className="text-xs font-medium">Date</p>
                          <p>{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Items</p>
                          <p>{order.item_count} item{order.item_count !== 1 ? "s" : ""}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Payment</p>
                          <p className="capitalize">{order.payment_status || "Pending"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Amount</p>
                          <p className="font-semibold text-foreground">₹{(order.final_amount || order.total_amount).toFixed(2)}</p>
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          <p className="text-xs font-medium mb-1">Items:</p>
                          <div className="flex flex-wrap gap-2">
                            {order.items.slice(0, 3).map((item) => (
                              <span key={item.order_item_id} className="bg-muted px-2 py-1 rounded text-xs">
                                {item.product_title} ({item.quantity}x)
                              </span>
                            ))}
                            {order.items.length > 3 && (
                              <span className="bg-muted px-2 py-1 rounded text-xs">
                                +{order.items.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" onClick={() => setSelectedOrder(order)}>
                          View Details
                        </Button>
                      </SheetTrigger>
                      {selectedOrder?.order_id === order.order_id && (
                        <SheetContent className="w-full sm:w-[600px] overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>Order Details</SheetTitle>
                            <SheetDescription>
                              Order #{order.order_id.substring(0, 8).toUpperCase()}
                            </SheetDescription>
                          </SheetHeader>

                          <div className="mt-6 space-y-6">
                            {/* Order Status */}
                            <div className="space-y-2">
                              <h3 className="font-semibold">Status</h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={order.status_badge_variant} className="flex items-center gap-1 w-fit">
                                  {getStatusIcon(order.status)}
                                  {order.status}
                                </Badge>
                                {order.status?.toLowerCase() !== "cancelled" && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => cancelOrder(order.order_id)}
                                  >
                                    Cancel Order
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Order Summary */}
                            <div className="space-y-2">
                              <h3 className="font-semibold">Order Summary</h3>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Order Date</span>
                                  <span className="font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Last Updated</span>
                                  <span className="font-medium">
                                    {order.updated_at ? new Date(order.updated_at).toLocaleDateString() : "—"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Payment Status</span>
                                  <span className="font-medium capitalize">{order.payment_status || "Pending"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-2">
                              <h3 className="font-semibold">Items ({order.item_count})</h3>
                              <div className="space-y-3">
                                {order.items?.map((item) => (
                                  <div key={item.order_item_id} className="border rounded-lg p-3 space-y-1">
                                    <p className="font-medium text-sm">{item.product_title}</p>
                                    {item.variant_name && <p className="text-xs text-muted-foreground">{item.variant_name}</p>}
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Qty: {item.quantity}</span>
                                      <span className="font-medium">₹{(item.subtotal || item.price_per_unit * item.quantity).toFixed(2)}</span>
                                    </div>
                                    {item.status && (
                                      <p className="text-xs text-muted-foreground capitalize">Status: {item.status}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Pricing */}
                            <div className="space-y-2 border-t pt-4">
                              <h3 className="font-semibold">Pricing</h3>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Subtotal</span>
                                  <span>₹{order.total_amount.toFixed(2)}</span>
                                </div>
                                {order.discount_amount && order.discount_amount > 0 && (
                                  <div className="flex justify-between text-green-600">
                                    <span>Discount</span>
                                    <span>-₹{order.discount_amount.toFixed(2)}</span>
                                  </div>
                                )}
                                {order.shipping_cost && order.shipping_cost > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Shipping</span>
                                    <span>₹{order.shipping_cost.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-semibold border-t pt-2">
                                  <span>Total</span>
                                  <span>₹{(order.final_amount || order.total_amount).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </SheetContent>
                      )}
                    </Sheet>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
