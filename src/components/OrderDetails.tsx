import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Package,
  TrendingUp,
  Truck,
  FileText,
  History,
  RotateCcw,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OrderDetail {
  id: string;
  product_id?: string;
  bundle_id?: string;
  product_title?: string;
  bundle_name?: string;
  quantity: number;
  total_amount: number;
  status: string;
  shipping_address?: string;
  estimated_delivery_date?: string;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  description?: string;
}

interface OrderTracking {
  tracking_id: string;
  status: string;
  url: string;
  location?: string;
  notes?: string;
  updated_at: string;
}

interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status?: string;
  new_status: string;
  remarks?: string;
  changed_at: string;
}

interface OrderReturn {
  return_id: string;
  reason: string;
  status: string;
  notes?: string;
  initiated_at: string;
}

interface OrderRefund {
  refund_id: string;
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface OrderDetailsProps {
  orderId: string;
  sellerId: string;
}

export function OrderDetails({ orderId, sellerId }: OrderDetailsProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [tracking, setTracking] = useState<OrderTracking[]>([]);
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistory[]>([]);
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [refunds, setRefunds] = useState<OrderRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("shipped");
  const [trackingNotes, setTrackingNotes] = useState("");
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadOrderDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, sellerId]);

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      // Load order details
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("seller_id", sellerId)
        .single();

      if (orderError || !orderData) {
        toast({
          title: "Error loading order",
          description: orderError?.message || "Order not found",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setOrder(orderData as OrderDetail);

      // Load tracking info
      const { data: trackingData } = await supabase
        .from("order_tracking")
        .select("*")
        .eq("order_id", orderId)
        .order("updated_at", { ascending: false });

      if (trackingData) {
        setTracking(trackingData as OrderTracking[]);
      }

      // Load status history
      const { data: historyData } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("changed_at", { ascending: false });

      if (historyData) {
        setStatusHistory(historyData as OrderStatusHistory[]);
      }

      // Load returns
      const { data: returnsData } = await supabase
        .from("order_returns")
        .select("*")
        .eq("order_id", orderId);

      if (returnsData) {
        setReturns(returnsData as OrderReturn[]);
      }

      // Load refunds
      const { data: refundsData } = await supabase
        .from("order_refunds")
        .select("*")
        .eq("order_id", orderId);

      if (refundsData) {
        setRefunds(refundsData as OrderRefund[]);
      }
    } catch (error) {
      console.error("Error loading order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;

      // Add to status history
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        old_status: order?.status,
        new_status: "cancelled",
        remarks: cancelReason,
        changed_by: sellerId,
      });

      toast({
        title: "Order cancelled",
        description: `Order cancelled with reason: ${cancelReason || "No reason provided"}`,
      });

      setCancelReason("");
      setShowCancelDialog(false);
      loadOrderDetails();
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
    }
  };

  const handleAddTracking = async () => {
    if (!trackingUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter tracking URL",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("order_tracking").insert({
        order_id: orderId,
        status: trackingStatus,
        url: trackingUrl,
        notes: trackingNotes || null,
      });

      if (error) throw error;

      toast({
        title: "Tracking added",
        description: "Tracking information updated successfully",
      });

      setTrackingUrl("");
      setTrackingNotes("");
      setTrackingStatus("shipped");
      setShowTrackingDialog(false);
      loadOrderDetails();
    } catch (error) {
      console.error("Error adding tracking:", error);
      toast({
        title: "Error",
        description: "Failed to add tracking information",
        variant: "destructive",
      });
    }
  };

  const handleReturnApproval = async (approved: boolean) => {
    try {
      if (approved) {
        // Process return
        const { error } = await supabase
          .from("order_returns")
          .update({ status: "approved" })
          .eq("return_id", returns[0]?.return_id);

        if (error) throw error;

        toast({
          title: "Return approved",
          description: "Return request has been approved",
        });
      } else {
        // Reject return with reason
        const { error } = await supabase
          .from("order_returns")
          .update({ status: "rejected", notes: returnReason })
          .eq("return_id", returns[0]?.return_id);

        if (error) throw error;

        toast({
          title: "Return rejected",
          description: `Return rejected: ${returnReason}`,
        });
      }

      setShowReturnDialog(false);
      setReturnReason("");
      loadOrderDetails();
    } catch (error) {
      console.error("Error processing return:", error);
      toast({
        title: "Error",
        description: "Failed to process return",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading order details...</div>
        </CardContent>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Order not found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>
                {order.product_title || order.bundle_name || "Unknown Product"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">Order ID: {orderId}</p>
            </div>
            <Badge variant="outline">{order.status.toUpperCase()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Quantity</p>
              <p className="font-semibold">{order.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-semibold">₹{order.total_amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-semibold">
                {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Est. Delivery</p>
              <p className="font-semibold">
                {order.estimated_delivery_date
                  ? new Date(order.estimated_delivery_date).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>

          {order.description && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm">{order.description}</p>
            </div>
          )}

          {order.shipping_address && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Shipping Address</p>
              <p className="text-sm">{order.shipping_address}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Details */}
      <Tabs defaultValue="tracking" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tracking">
            <Truck className="h-4 w-4 mr-2" />
            Tracking
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="returns">
            <RotateCcw className="h-4 w-4 mr-2" />
            Returns
          </TabsTrigger>
          <TabsTrigger value="refunds">
            <TrendingUp className="h-4 w-4 mr-2" />
            Refunds
          </TabsTrigger>
        </TabsList>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Tracking Information</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowTrackingDialog(true)}
                  disabled={order.status === "cancelled"}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Add Tracking
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tracking.length === 0 ? (
                <p className="text-muted-foreground text-sm">No tracking information yet</p>
              ) : (
                <div className="space-y-3">
                  {tracking.map((track) => (
                    <div key={track.tracking_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge>{track.status}</Badge>
                          <p className="text-sm mt-2">
                            <a
                              href={track.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {track.url}
                            </a>
                          </p>
                          {track.location && <p className="text-sm text-muted-foreground">{track.location}</p>}
                          {track.notes && <p className="text-sm text-muted-foreground mt-2">{track.notes}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(track.updated_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              {statusHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm">No status history yet</p>
              ) : (
                <div className="space-y-3">
                  {statusHistory.map((entry) => (
                    <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{entry.old_status}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge>{entry.new_status}</Badge>
                      </div>
                      {entry.remarks && (
                        <p className="text-sm text-muted-foreground mt-2">{entry.remarks}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.changed_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Returns Tab */}
        <TabsContent value="returns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Return Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {returns.length === 0 ? (
                <p className="text-muted-foreground text-sm">No return requests</p>
              ) : (
                <div className="space-y-3">
                  {returns.map((ret) => (
                    <div key={ret.return_id} className="border rounded-lg p-4 bg-amber-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{ret.reason}</p>
                          <Badge className="mt-2" variant="outline">
                            {ret.status}
                          </Badge>
                          {ret.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{ret.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Initiated: {new Date(ret.initiated_at).toLocaleString()}
                          </p>
                        </div>
                        {ret.status === "initiated" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setShowReturnDialog(true)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleReturnApproval(true)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refunds Tab */}
        <TabsContent value="refunds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Refunds</CardTitle>
            </CardHeader>
            <CardContent>
              {refunds.length === 0 ? (
                <p className="text-muted-foreground text-sm">No refunds processed</p>
              ) : (
                <div className="space-y-3">
                  {refunds.map((refund) => (
                    <div key={refund.refund_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">₹{refund.amount.toFixed(2)}</p>
                          <Badge>{refund.status}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(refund.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {order.status === "pending" && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowCancelDialog(true)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Order
            </Button>
          )}
          {order.status === "processing" && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowCancelDialog(true)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Order
            </Button>
          )}
          {returns.some((r) => r.status === "initiated") && (
            <Button
              variant="outline"
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Return Pending Review
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Cancel Order Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the reason for cancelling this order. This will be visible to the buyer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Reason for Cancellation</Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g., Out of stock, Unable to fulfill, etc."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Tracking Dialog */}
      <AlertDialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Tracking Information</AlertDialogTitle>
            <AlertDialogDescription>
              Provide tracking details so buyer can track their shipment
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="tracking-url">Tracking URL *</Label>
              <Input
                id="tracking-url"
                placeholder="e.g., https://tracking.courier.com/ABC123"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="tracking-status">Status</Label>
              <select
                id="tracking-status"
                title="Tracking Status"
                value={trackingStatus}
                onChange={(e) => setTrackingStatus(e.target.value)}
                className="w-full mt-2 p-2 border rounded"
              >
                <option value="shipped">Shipped</option>
                <option value="in_transit">In Transit</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <div>
              <Label htmlFor="tracking-notes">Notes (Optional)</Label>
              <Textarea
                id="tracking-notes"
                placeholder="Additional tracking notes..."
                value={trackingNotes}
                onChange={(e) => setTrackingNotes(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddTracking}>
              Add Tracking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return Rejection Dialog */}
      <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Return</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the reason for rejecting this return request
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-reason">Reason for Rejection</Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g., Product condition acceptable, etc."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Reviewing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleReturnApproval(false)}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
