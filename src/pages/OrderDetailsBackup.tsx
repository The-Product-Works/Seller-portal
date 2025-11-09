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
  address_id?: string;
  status: string;
  total_amount: number;
  shipping_cost?: number;
  discount_amount?: number;
  final_amount: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

interface Buyer {
  id: string;
  email?: string;
  phone?: string;
}

interface Address {
  address_id?: string;
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
}

interface OrderItem {
  order_item_id: string;
  listing_id: string;
  variant_id?: string;
  seller_id: string;
  quantity: number;
  price_per_unit: number;
  subtotal: number;
  seller_title?: string;
  sku?: string;
  variant_name?: string;
}

interface OrderItemResponse {
  order_item_id: string;
  listing_id: string;
  variant_id?: string;
  seller_id: string;
  quantity: number;
  price_per_unit: number;
  subtotal: number;
  seller_product_listings?: {
    seller_title?: string;
  };
  listing_variants?: {
    variant_name?: string;
    sku?: string;
  };
}

export default function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [order, setOrder] = useState<SimpleOrder | null>(null);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [orderReturns, setOrderReturns] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Dialog states
  const [packingDialogOpen, setPackingDialogOpen] = useState(false);
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

      // Fetch related data: buyer, address, items, returns
      try {
        const buyerPromise = supabase.from("users").select("id,email,phone").eq("id", orderData.buyer_id).single();
        const addressPromise = orderData.address_id
          ? supabase.from("addresses").select("*").eq("address_id", orderData.address_id).single()
          : Promise.resolve({ data: null, error: null });

        const itemsPromise = supabase
          .from("order_items")
          .select(`*, seller_product_listings ( seller_title ), listing_variants ( variant_name, sku )`)
          .eq("order_id", orderData.order_id);

        const returnsPromise = supabase.from("order_returns").select("*").eq("order_id", orderData.order_id);

        const [buyerRes, addressRes, itemsRes, returnsRes] = await Promise.all([buyerPromise, addressPromise, itemsPromise, returnsPromise]);

        if (buyerRes && !buyerRes.error && buyerRes.data) {
          setBuyer({
            id: buyerRes.data.id,
            email: buyerRes.data.email,
            phone: buyerRes.data.phone
          });
        }
        if (addressRes && !addressRes.error && addressRes.data) setShippingAddress(addressRes.data as Address);
        if (itemsRes && !itemsRes.error && itemsRes.data) {
          const mapped: OrderItem[] = (itemsRes.data as OrderItemResponse[]).map((it) => ({
            order_item_id: it.order_item_id,
            listing_id: it.listing_id,
            variant_id: it.variant_id,
            seller_id: it.seller_id,
            quantity: it.quantity,
            price_per_unit: it.price_per_unit,
            subtotal: it.subtotal,
            seller_title: it.seller_product_listings?.seller_title,
            sku: it.listing_variants?.sku,
            variant_name: it.listing_variants?.variant_name,
          }));
          setItems(mapped);
        }
        if (returnsRes && !returnsRes.error && returnsRes.data) setOrderReturns(returnsRes.data || []);
      } catch (err) {
        console.warn("Couldn't fetch related order data:", err);
      }
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

  const maskPhone = (phone?: string) => {
    if (!phone) return "N/A";
    return phone.replace(/(\d{2})\d{6}(\d{2})/, "$1******$2");
  };

  const computeMarketplaceFee = (amount: number | undefined) => {
    if (!amount) return 0;
    return Math.round(amount * 0.1); // 10% fee
  };

  const updateOrderStatus = async (newStatus: string) => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
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
    updateOrderStatus("packed");
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
    updateOrderStatus("cancelled");
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

            {/* Items List */}
            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.order_item_id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{item.seller_title || 'Product'}</div>
                          <div className="text-sm text-gray-600">
                            SKU: {item.sku || 'N/A'} | Qty: {item.quantity} | ₹{item.price_per_unit.toFixed(2)} each
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">₹{item.subtotal.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <div className="font-medium">{buyer?.email || "N/A"}</div>
                  <div className="text-muted-foreground text-xs">Phone: {maskPhone(buyer?.phone)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping & Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping & Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <div className="font-medium">{shippingAddress?.name || "N/A"}</div>
                  <div>{shippingAddress?.line1} {shippingAddress?.line2}</div>
                  <div>{shippingAddress?.city}, {shippingAddress?.state} {shippingAddress?.postal_code}</div>
                  <div className="mt-2">Payment: <strong className="capitalize">{order?.payment_status || 'prepaid'}</strong></div>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Item Total:</span>
                  <span>₹{order?.total_amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>{order?.shipping_cost ? `₹${order.shipping_cost.toFixed(2)}` : '₹0 (Free)'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Marketplace Fee:</span>
                  <span>₹{computeMarketplaceFee(order?.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Seller Earnings:</span>
                  <span>₹{( (order?.total_amount || 0) - computeMarketplaceFee(order?.total_amount)).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Order Actions</CardTitle>
                <p className="text-sm text-muted-foreground">Current Status: <strong>{order?.status}</strong></p>
              </CardHeader>
              <CardContent className="space-y-3">
                {order?.status === "confirmed" && (
                  <Dialog open={packingDialogOpen} onOpenChange={setPackingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-green-600 hover:bg-green-700">📦 Mark as Packed</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Mark as Packed</DialogTitle>
                        <DialogDescription>Enter tracking details for this order</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="tracking">Tracking Number *</Label>
                          <Input id="tracking" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Enter tracking number" />
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
                        <Button variant="outline" onClick={() => setPackingDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleMarkAsPacked} disabled={updating}>{updating ? 'Updating...' : 'Mark as Packed'}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {order?.status === "packed" && (
                  <Button onClick={handleMarkAsShipped} disabled={updating} className="w-full bg-blue-600 hover:bg-blue-700">🚚 Mark as Shipped</Button>
                )}

                {order?.status === "shipped" && (
                  <Button onClick={handleMarkAsDelivered} disabled={updating} className="w-full bg-purple-600 hover:bg-purple-700">✅ Mark as Delivered</Button>
                )}

                {!["delivered","cancelled"].includes(order?.status || '') && (
                  <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="w-full">❌ Cancel Order</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancel Order</DialogTitle>
                        <DialogDescription>Please provide a reason for cancellation</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="reason">Cancellation Reason *</Label>
                          <Textarea id="reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Enter reason for cancellation..." />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Order</Button>
                        <Button variant="destructive" onClick={handleCancelOrder} disabled={updating}>{updating ? 'Cancelling...' : 'Cancel Order'}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <Badge variant={order?.payment_status === "paid" ? "default" : "secondary"}>{order?.payment_status || "pending"}</Badge>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total Amount:</span>
                  <span>₹{order?.final_amount?.toFixed(2) || '0.00'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}