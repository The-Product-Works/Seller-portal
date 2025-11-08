import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShoppingCart, X, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SellerOrder {
  id: string;
  product_id?: string;
  bundle_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  quantity: number;
  total_amount: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  shipping_address?: string;
  estimated_delivery_date?: string;
  created_at: string;
  product_title?: string;
}

interface SellerOrdersProps {
  sellerId?: string | null;
  limit?: number;
}

export function SellerOrders({ sellerId, limit = 10 }: SellerOrdersProps) {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (sellerId) {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const loadOrders = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", sellerId)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching orders:", error);
        toast({
          title: "Error loading orders",
          description: error.message,
          variant: "destructive",
        });
        setOrders([]);
      } else {
        setOrders(data || []);
      }
    } catch (error) {
      console.error("Exception loading orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("seller_id", sellerId);

      if (error) {
        toast({
          title: "Error cancelling order",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setOrders(orders.filter(o => o.id !== orderId));
        toast({
          title: "Order cancelled",
          description: "The order has been cancelled successfully",
        });
        setCancelingOrderId(null);
        setCancelReason("");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No orders yet. Your orders will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Orders ({orders.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {order.customer_name || "Guest Customer"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.customer_email && `${order.customer_email}`}
                  </p>
                  {order.customer_phone && (
                    <p className="text-xs text-muted-foreground">
                      {order.customer_phone}
                    </p>
                  )}
                </div>
                <Badge className={`${getStatusColor(order.status)}`}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(order.status)}
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3 pb-3 border-b">
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-medium">{order.quantity} units</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">₹{Number(order.total_amount).toFixed(2)}</p>
                </div>
              </div>

              {order.shipping_address && (
                <div className="text-xs mb-3 pb-3 border-b">
                  <p className="text-muted-foreground mb-1">Shipping Address</p>
                  <p className="line-clamp-2">{order.shipping_address}</p>
                </div>
              )}

              {order.estimated_delivery_date && (
                <div className="text-xs mb-3">
                  <p className="text-muted-foreground">Estimated Delivery</p>
                  <p>
                    {new Date(order.estimated_delivery_date).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Ordered: {new Date(order.created_at).toLocaleString()}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCancelingOrderId(order.id)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel Order
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cancel Order Dialog */}
      <AlertDialog open={!!cancelingOrderId} onOpenChange={(open) => {
        if (!open) {
          setCancelingOrderId(null);
          setCancelReason("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? The buyer will be notified immediately.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Cancellation Reason (optional)</label>
            <textarea
              className="w-full mt-2 p-2 border rounded text-sm"
              placeholder="e.g., Out of stock, Customer request, etc."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelingOrderId) {
                  handleCancelOrder(cancelingOrderId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
