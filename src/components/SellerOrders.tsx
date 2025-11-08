import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ShoppingCart, X, Clock, CheckCircle, XCircle, RotateCcw, Truck, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ReturnQCDialog } from "@/components/ReturnQCDialog";
import { ReturnTrackingDialog } from "@/components/ReturnTrackingDialog";
import { OrderTrackingDialog } from "@/components/OrderTrackingDialog";

interface SellerOrder {
  id: string;
  product_id?: string;
  bundle_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  quantity: number;
  total_amount: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "return_requested";
  shipping_address?: string;
  estimated_delivery_date?: string;
  created_at: string;
  product_title?: string;
}

interface SellerOrdersProps {
  sellerId?: string | null;
  limit?: number;
  statusFilter?: string;
}

export function SellerOrders({ sellerId, limit = 10, statusFilter = "all" }: SellerOrdersProps) {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const [returningOrderId, setReturningOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnRefundAmount, setReturnRefundAmount] = useState<number>(0);
  const [showQCDialog, setShowQCDialog] = useState(false);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<string | null>(null);
  const [showOrderTrackingDialog, setShowOrderTrackingDialog] = useState(false);
  const [selectedOrderForOrderTracking, setSelectedOrderForOrderTracking] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (sellerId) {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, statusFilter]);

  const loadOrders = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select("*")
        .eq("seller_id", sellerId);

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      } else {
        query = query.neq("status", "cancelled");
      }

      const { data, error } = await query
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
      // Update order status to cancelled with reason in remarks
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("seller_id", sellerId);

      if (updateError) {
        toast({
          title: "Error cancelling order",
          description: updateError.message,
          variant: "destructive",
        });
        return;
      }

      // Store cancellation reason in order_status_history
      if (cancelReason) {
        const { error: historyError } = await supabase
          .from("order_status_history")
          .insert({
            order_id: orderId,
            old_status: "pending",
            new_status: "cancelled",
            remarks: cancelReason,
            changed_at: new Date().toISOString(),
          });

        if (historyError) {
          console.error("Error storing cancellation reason:", historyError);
        }
      }

      setOrders(orders.filter(o => o.id !== orderId));
      toast({
        title: "Order cancelled",
        description: "The order has been cancelled. Buyer will be notified with the reason.",
      });
      setCancelingOrderId(null);
      setCancelReason("");
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
    }
  };

  const handleReturnRequest = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "return_requested",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("seller_id", sellerId);

      if (error) {
        toast({
          title: "Error processing return request",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Update order status in list to show return_requested
        setOrders(orders.map(o => 
          o.id === orderId 
            ? { ...o, status: "return_requested" }
            : o
        ));
        toast({
          title: "Return request processed",
          description: `Refund of ₹${returnRefundAmount.toFixed(2)} will be initiated. Buyer will be notified.`,
        });
        setReturningOrderId(null);
        setReturnReason("");
        setReturnRefundAmount(0);
      }
    } catch (error) {
      console.error("Error processing return request:", error);
      toast({
        title: "Error",
        description: "Failed to process return request",
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
      case "return_requested":
        return "bg-orange-100 text-orange-800";
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
      case "return_requested":
        return <RotateCcw className="h-4 w-4" />;
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

              <div className="flex gap-2 mt-4 flex-wrap">
                {(order.status === "pending" || order.status === "processing") && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCancelingOrderId(order.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel Order
                    </Button>
                    {order.status === "processing" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrderForOrderTracking(order.id);
                          setShowOrderTrackingDialog(true);
                        }}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Truck className="h-4 w-4 mr-1" />
                        Add Tracking
                      </Button>
                    )}
                  </>
                )}
                {(order.status === "delivered" || order.status === "shipped") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReturningOrderId(order.id);
                      setReturnRefundAmount(order.total_amount);
                    }}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Return Request
                  </Button>
                )}
                {order.status === "return_requested" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedReturnId(order.id);
                      setShowQCDialog(true);
                    }}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Quality Check
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quality Check Dialog */}
      {selectedReturnId && (
        <ReturnQCDialog
          open={showQCDialog}
          onOpenChange={setShowQCDialog}
          returnId={selectedReturnId}
          sellerId={sellerId}
          onSuccess={() => {
            loadOrders();
          }}
        />
      )}

      {/* Order Tracking Dialog */}
      {selectedOrderForOrderTracking && (
        <OrderTrackingDialog
          open={showOrderTrackingDialog}
          onOpenChange={setShowOrderTrackingDialog}
          orderId={selectedOrderForOrderTracking}
          sellerId={sellerId}
          onSuccess={() => {
            loadOrders();
          }}
        />
      )}

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

      {/* Return Request Dialog */}
      <AlertDialog open={!!returningOrderId} onOpenChange={(open) => {
        if (!open) {
          setReturningOrderId(null);
          setReturnReason("");
          setReturnRefundAmount(0);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Process Return Request</AlertDialogTitle>
            <AlertDialogDescription>
              Handle the customer's return request. A refund will be issued to the buyer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Refund Amount (₹)</label>
              <input
                type="number"
                className="w-full mt-2 p-2 border rounded text-sm"
                value={returnRefundAmount}
                onChange={(e) => setReturnRefundAmount(Number(e.target.value))}
                placeholder="Enter refund amount"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Return Reason (optional)</label>
              <textarea
                className="w-full mt-2 p-2 border rounded text-sm"
                placeholder="e.g., Defective product, Customer not satisfied, etc."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Decline Return</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (returningOrderId && returnRefundAmount > 0) {
                  handleReturnRequest(returningOrderId);
                } else {
                  toast({
                    title: "Invalid refund amount",
                    description: "Please enter a valid refund amount",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Accept & Process Return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
