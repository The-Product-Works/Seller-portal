import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Package, User, MapPin, CreditCard } from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";

// Simple order type based on actual database structure
interface SimpleOrder {
  order_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  total_amount: number;
  final_amount: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

export default function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [order, setOrder] = useState<SimpleOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Dialog states
  const [packingDialogOpen, setPackingDialogOpen] = useState(false);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  
  // Form states
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierPartner, setCourierPartner] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId, loadOrderDetails]);

  const loadOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      const sellerId = await getAuthenticatedSellerId();
      
      if (!sellerId) {
        navigate("/");
        return;
      }

      console.log("🔍 Loading order:", orderId, "for seller:", sellerId);

      // Simple query to get basic order info
      const { data: orderData, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_id", orderId)
        .eq("seller_id", sellerId)
        .single();

      console.log("📦 Order data:", { orderData, error });

      if (error) {
        console.error("❌ Order query error:", error);
        throw error;
      }

      if (!orderData) {
        toast({
          title: "Order not found",
          description: "The order you're looking for doesn't exist or you don't have access to it.",
          variant: "destructive",
        });
        navigate("/orders");
        return;
      }

      setOrder(orderData);
    } catch (error) {
      console.error("❌ Error loading order:", error);
      toast({
        title: "Error loading order",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate, toast]);

  const updateOrderStatus = async (newStatus: string, additionalData?: Record<string, unknown>) => {
    try {
      setUpdating(true);

      const updateData: Record<string, unknown> = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Add any additional data
      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("order_id", orderId);

      if (error) throw error;

      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}`,
      });

      // Reload order details
      loadOrderDetails();
      
      // Close any open dialogs
      setPackingDialogOpen(false);
      setShippingDialogOpen(false);
      setCancelDialogOpen(false);
      
      // Reset form states
      setTrackingNumber("");
      setCourierPartner("");
      setCancelReason("");

    } catch (error) {
      console.error("❌ Error updating order:", error);
      toast({
        title: "Error",
        description: "Failed to update order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsPacked = () => {
    if (!trackingNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a tracking number.",
        variant: "destructive",
      });
      return;
    }
    updateOrderStatus("packed", { tracking_number: trackingNumber, courier_partner: courierPartner });
  };

  const handleMarkAsShipped = () => {
    updateOrderStatus("shipped");
  };

  const handleMarkAsDelivered = () => {
    updateOrderStatus("delivered");
  };

  const handleCancelOrder = () => {
    if (!cancelReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for cancellation.",
        variant: "destructive",
      });
      return;
    }
    updateOrderStatus("cancelled", { cancel_reason: cancelReason });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "packed":
        return "bg-orange-100 text-orange-800";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">The order you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/orders")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Order #{order.order_id.slice(0, 8)}
              </h1>
              <p className="text-gray-600">
                Created: {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            
            <Badge className={getStatusColor(order.status)}>
              <span className="capitalize">{order.status}</span>
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Order Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-mono">{order.order_id}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-semibold">₹{order.total_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Final Amount:</span>
                    <span className="font-semibold">₹{order.final_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Status:</span>
                    <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                      {order.payment_status || "pending"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Order Actions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Current Status: <strong>{order.status}</strong>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Status-Based Actions */}
                {order.status === "confirmed" && (
                  <Dialog open={packingDialogOpen} onOpenChange={setPackingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        📦 Mark as Packed
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Mark as Packed</DialogTitle>
                        <DialogDescription>
                          Enter tracking details for this order
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="tracking">Tracking Number *</Label>
                          <Input
                            id="tracking"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder="Enter tracking number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="courier">Courier Partner</Label>
                          <Select value={courierPartner} onValueChange={setCourierPartner}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select courier" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bluedart">BlueDart</SelectItem>
                              <SelectItem value="dtdc">DTDC</SelectItem>
                              <SelectItem value="delhivery">Delhivery</SelectItem>
                              <SelectItem value="fedex">FedEx</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setPackingDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleMarkAsPacked} disabled={updating}>
                          {updating ? "Updating..." : "Mark as Packed"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {order.status === "packed" && (
                  <Button 
                    onClick={handleMarkAsShipped} 
                    disabled={updating}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    🚚 Mark as Shipped
                  </Button>
                )}

                {order.status === "shipped" && (
                  <Button 
                    onClick={handleMarkAsDelivered} 
                    disabled={updating}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    ✅ Mark as Delivered
                  </Button>
                )}

                {/* Cancel Order - Available for most statuses */}
                {!["delivered", "cancelled"].includes(order.status) && (
                  <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        ❌ Cancel Order
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancel Order</DialogTitle>
                        <DialogDescription>
                          Please provide a reason for cancellation
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="reason">Cancellation Reason *</Label>
                          <Textarea
                            id="reason"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Enter reason for cancellation..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                          Keep Order
                        </Button>
                        <Button variant="destructive" onClick={handleCancelOrder} disabled={updating}>
                          {updating ? "Cancelling..." : "Cancel Order"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Status Message for Final States */}
                {["delivered", "cancelled"].includes(order.status) && (
                  <div className="text-sm text-muted-foreground p-3 bg-muted rounded">
                    Order is <strong>{order.status}</strong> - No further actions available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                    {order.payment_status || "pending"}
                  </Badge>
                </div>
                
                <div className="flex justify-between font-medium">
                  <span>Total Amount:</span>
                  <span>₹{order.final_amount?.toFixed(2) || '0.00'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}