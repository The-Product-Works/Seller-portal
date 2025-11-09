import { useState, useEffect } from "react";
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
import { ArrowLeft, Package, User, MapPin, CreditCard, Truck, FileText, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import type { Database } from "@/integrations/supabase/database.types";

// Database type aliases for better readability
type Order = Database['public']['Tables']['orders']['Row'];
type OrderReturn = Database['public']['Tables']['order_returns']['Row'];
type OrderTracking = Database['public']['Tables']['order_tracking']['Row'];
type OrderCancellation = Database['public']['Tables']['order_cancellations']['Row'];
type OrderRefund = Database['public']['Tables']['order_refunds']['Row'];
type ReturnTracking = Database['public']['Tables']['return_tracking']['Row'];
type ReturnQualityCheck = Database['public']['Tables']['return_quality_checks']['Row'];
type OrderStatusHistory = Database['public']['Tables']['order_status_history']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Seller = Database['public']['Tables']['sellers']['Row'];

interface Buyer {
  id: string;
  email?: string;
  phone?: string;
  full_name?: string;
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

interface ExtendedOrderItem extends OrderItem {
  seller_title?: string;
  sku?: string;
  variant_name?: string;
}

interface OrderItemWithRelations {
  order_item_id: string;
  order_id: string;
  listing_variant_id: string;
  quantity: number;
  price: number;
  seller_product_listings?: {
    seller_title: string;
  };
  listing_variants?: {
    sku: string;
    variant_name: string;
  };
}

interface OrderUpdateData {
  status: string;
  updated_at: string;
  tracking_number?: string;
  courier_name?: string;
  estimated_delivery?: string;
  pickup_date?: string;
  delivery_instructions?: string;
  notes?: string;
}

export default function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Main data states
  const [order, setOrder] = useState<Order | null>(null);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
  const [items, setItems] = useState<ExtendedOrderItem[]>([]);
  const [orderReturns, setOrderReturns] = useState<OrderReturn[]>([]);
  const [orderTracking, setOrderTracking] = useState<OrderTracking[]>([]);
  const [orderCancellations, setOrderCancellations] = useState<OrderCancellation[]>([]);
  const [orderRefunds, setOrderRefunds] = useState<OrderRefund[]>([]);
  const [orderStatusHistory, setOrderStatusHistory] = useState<OrderStatusHistory[]>([]);
  const [returnTracking, setReturnTracking] = useState<ReturnTracking[]>([]);
  const [returnQualityChecks, setReturnQualityChecks] = useState<ReturnQualityCheck[]>([]);
  const [sellerDetails, setSellerDetails] = useState<Seller | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Dialog states
  const [packingDialogOpen, setPackingDialogOpen] = useState(false);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [returnQCDialogOpen, setReturnQCDialogOpen] = useState(false);
  const [returnCourierDialogOpen, setReturnCourierDialogOpen] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState<string>("");
  
  // Form states for courier assignment (comprehensive)
  const [courierDetails, setCourierDetails] = useState({
    consignmentNumber: "",
    trackingUrl: "",
    courierPartner: "",
    courierPhone: "",
    courierEmail: "",
    estimatedDelivery: "",
    courierAddress: "",
    pickupDate: "",
    deliveryInstructions: "",
    notes: "",
  });
  
  // Return/QC states  
  const [qcDetails, setQCDetails] = useState({
    result: "",
    remarks: "",
  });
  
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId, loadOrderDetails]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const sellerId = await getAuthenticatedSellerId();
      
      if (!sellerId) {
        navigate("/");
        return;
      }

      console.log("🔍 Loading comprehensive order details:", orderId, "for seller:", sellerId);

      // Get basic order
      const { data: orderData, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_id", orderId)
        .eq("seller_id", sellerId)
        .single();

      if (error || !orderData) {
        console.error("❌ Order query error:", error);
        toast({
          title: "Order not found",
          description: "The order you're looking for doesn't exist or you don't have access to it.",
          variant: "destructive",
        });
        navigate("/orders");
        return;
      }

      setOrder(orderData);

      // Get seller details for courier info
      const { data: sellerData } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", sellerId)
        .single();
      
      if (sellerData) setSellerDetails(sellerData);

      // Fetch all related data in parallel
      const [
        buyerRes,
        addressRes, 
        itemsRes,
        returnsRes,
        trackingRes,
        cancellationsRes,
        refundsRes,
        statusHistoryRes,
        returnTrackingRes,
        returnQCRes
      ] = await Promise.all([
        supabase.from("users").select("id,email,phone,full_name").eq("id", orderData.buyer_id).single(),
        orderData.address_id ? supabase.from("addresses").select("*").eq("address_id", orderData.address_id).single() : Promise.resolve({ data: null, error: null }),
        supabase.from("order_items").select(`*, seller_product_listings ( seller_title ), listing_variants ( variant_name, sku )`).eq("order_id", orderData.order_id),
        supabase.from("order_returns").select("*").eq("order_id", orderData.order_id),
        supabase.from("order_tracking").select("*").eq("order_id", orderData.order_id).order("updated_at", { ascending: false }),
        supabase.from("order_cancellations").select("*").eq("order_id", orderData.order_id),
        supabase.from("order_refunds").select("*").eq("order_id", orderData.order_id),
        supabase.from("order_status_history").select("*").eq("order_id", orderData.order_id).order("changed_at", { ascending: false }),
        supabase.from("return_tracking").select("*").order("updated_at", { ascending: false }),
        supabase.from("return_quality_checks").select("*")
      ]);

      // Set all the data
      if (buyerRes?.data) setBuyer(buyerRes.data as Buyer);
      if (addressRes?.data) setShippingAddress(addressRes.data as Address);
      if (itemsRes?.data) {
        const mappedItems: ExtendedOrderItem[] = itemsRes.data.map((item: OrderItemWithRelations) => ({
          ...item,
          seller_title: item.seller_product_listings?.seller_title,
          sku: item.listing_variants?.sku,
          variant_name: item.listing_variants?.variant_name,
        }));
        setItems(mappedItems);
      }
      if (returnsRes?.data) setOrderReturns(returnsRes.data);
      if (trackingRes?.data) setOrderTracking(trackingRes.data);
      if (cancellationsRes?.data) setOrderCancellations(cancellationsRes.data);
      if (refundsRes?.data) setOrderRefunds(refundsRes.data);
      if (statusHistoryRes?.data) setOrderStatusHistory(statusHistoryRes.data);
      if (returnTrackingRes?.data) setReturnTracking(returnTrackingRes.data);
      if (returnQCRes?.data) setReturnQualityChecks(returnQCRes.data);

    } catch (error) {
      console.error("❌ Error loading order details:", error);
      toast({
        title: "Error loading order",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const maskPhone = (phone?: string) => {
    if (!phone) return "N/A";
    return phone.replace(/(\d{2})\d{6}(\d{2})/, "$1******$2");
  };

  const computeMarketplaceFee = (amount: number | undefined) => {
    if (!amount) return 0;
    return Math.round(amount * 0.1); // 10% fee
  };

  const resetCourierForm = () => {
    setCourierDetails({
      consignmentNumber: "",
      trackingUrl: "",
      courierPartner: "",
      courierPhone: "",
      courierEmail: "",
      estimatedDelivery: "",
      courierAddress: "",
      pickupDate: "",
      deliveryInstructions: "",
      notes: "",
    });
  };

  const updateOrderStatus = async (newStatus: string, additionalData?: Partial<OrderUpdateData>) => {
    try {
      setUpdating(true);
      const sellerId = await getAuthenticatedSellerId();

      const updateData: OrderUpdateData = { 
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...additionalData
      };

      // Update order status
      const { error: orderError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("order_id", orderId);

      if (orderError) throw orderError;

      // Add to status history
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: orderId!,
          changed_by: sellerId,
          old_status: order?.status,
          new_status: newStatus,
          remarks: additionalData?.notes || `Status changed to ${newStatus}`,
        });

      if (historyError) console.warn("Could not add status history:", historyError);

      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}`,
      });

      loadOrderDetails();
      closeAllDialogs();

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

  const handleMarkAsPacked = async () => {
    if (!courierDetails.consignmentNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a consignment number.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Insert comprehensive tracking record
      const { error: trackingError } = await supabase
        .from("order_tracking")
        .insert({
          order_id: orderId!,
          status: "packed",
          url: courierDetails.trackingUrl || `https://track.courier.com/${courierDetails.consignmentNumber}`,
          location: sellerDetails?.city || "Warehouse",
          notes: `Packed by seller. Courier: ${courierDetails.courierPartner}. Phone: ${courierDetails.courierPhone}. Consignment: ${courierDetails.consignmentNumber}. Instructions: ${courierDetails.deliveryInstructions}`,
        });

      if (trackingError) {
        console.warn("Could not create tracking record:", trackingError);
      }

      await updateOrderStatus("packed", {
        courier_partner: courierDetails.courierPartner,
        tracking_number: courierDetails.consignmentNumber,
        courier_phone: courierDetails.courierPhone,
        courier_email: courierDetails.courierEmail,
        estimated_delivery: courierDetails.estimatedDelivery || null,
        pickup_date: courierDetails.pickupDate || null,
        notes: courierDetails.notes,
      });

    } catch (error) {
      console.error("Error in packing process:", error);
      toast({
        title: "Error",
        description: "Failed to mark as packed. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsShipped = async () => {
    try {
      const { error: trackingError } = await supabase
        .from("order_tracking")
        .insert({
          order_id: orderId!,
          status: "shipped",
          url: orderTracking[0]?.url || `https://track.courier.com/tracking`,
          location: "In Transit",
          notes: "Order has been shipped and is on the way to customer",
        });

      if (trackingError) console.warn("Could not create tracking record:", trackingError);

      await updateOrderStatus("shipped");
    } catch (error) {
      console.error("Error shipping order:", error);
    }
  };

  const handleMarkAsDelivered = async () => {
    try {
      const { error: trackingError } = await supabase
        .from("order_tracking")
        .insert({
          order_id: orderId!,
          status: "delivered",
          url: orderTracking[0]?.url || `https://track.courier.com/tracking`,
          location: shippingAddress?.city || "Customer Location",
          notes: "Order has been successfully delivered to customer",
        });

      if (trackingError) console.warn("Could not create tracking record:", trackingError);

      await updateOrderStatus("delivered");
    } catch (error) {
      console.error("Error marking as delivered:", error);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for cancellation.",
        variant: "destructive",
      });
      return;
    }

    try {
      const sellerId = await getAuthenticatedSellerId();

      // Add cancellation record
      const { error: cancellationError } = await supabase
        .from("order_cancellations")
        .insert({
          order_id: orderId!,
          cancelled_by: sellerId!,
          cancelled_by_role: "seller",
          reason: cancelReason,
          refund_status: "pending",
        });

      if (cancellationError) console.warn("Could not create cancellation record:", cancellationError);

      await updateOrderStatus("cancelled", { cancel_reason: cancelReason });
    } catch (error) {
      console.error("Error cancelling order:", error);
    }
  };

  const handleReturnQC = async (returnId: string, result: "passed" | "failed") => {
    try {
      const sellerId = await getAuthenticatedSellerId();

      const { error: qcError } = await supabase
        .from("return_quality_checks")
        .insert({
          return_id: returnId,
          performed_by: sellerId!,
          result: result,
          remarks: qcDetails.remarks,
        });

      if (qcError) throw qcError;

      // Update return status based on QC result
      const newStatus = result === "passed" ? "approved" : "rejected";
      const { error: returnError } = await supabase
        .from("order_returns")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("return_id", returnId);

      if (returnError) throw returnError;

      toast({
        title: "QC Complete",
        description: `Return marked as ${result}`,
      });

      loadOrderDetails();
      setReturnQCDialogOpen(false);
      setQCDetails({ result: "", remarks: "" });

    } catch (error) {
      console.error("Error in return QC:", error);
      toast({
        title: "Error",
        description: "Failed to complete QC. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReturnCourierAssignment = async (returnId: string) => {
    if (!courierDetails.consignmentNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter consignment details for return pickup.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create return tracking record
      const { error: trackingError } = await supabase
        .from("return_tracking")
        .insert({
          return_id: returnId,
          status: "pickup_scheduled",
          location: shippingAddress?.city || "Customer Location", 
          notes: `Return pickup scheduled. Courier: ${courierDetails.courierPartner}. Phone: ${courierDetails.courierPhone}. Consignment: ${courierDetails.consignmentNumber}`,
        });

      if (trackingError) throw trackingError;

      // Update return status
      const { error: returnError } = await supabase
        .from("order_returns")
        .update({ 
          status: "pickup_scheduled",
          updated_at: new Date().toISOString(),
          notes: `Pickup scheduled with ${courierDetails.courierPartner}`
        })
        .eq("return_id", returnId);

      if (returnError) throw returnError;

      toast({
        title: "Return Pickup Scheduled",
        description: "Courier has been assigned for return pickup.",
      });

      loadOrderDetails();
      setReturnCourierDialogOpen(false);
      resetCourierForm();

    } catch (error) {
      console.error("Error assigning return courier:", error);
      toast({
        title: "Error", 
        description: "Failed to assign courier for return. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleInitiateRefund = async (returnId: string) => {
    try {
      const sellerId = await getAuthenticatedSellerId();

      const { error: refundError } = await supabase
        .from("order_refunds")
        .insert({
          order_id: orderId!,
          return_id: returnId,
          processed_by: sellerId!,
          amount: order?.final_amount || 0,
          method: "original",
          status: "pending",
        });

      if (refundError) throw refundError;

      // Update return status
      const { error: returnError } = await supabase
        .from("order_returns")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("return_id", returnId);

      if (returnError) throw returnError;

      toast({
        title: "Refund Initiated",
        description: "Refund has been initiated and will be processed shortly.",
      });

      loadOrderDetails();

    } catch (error) {
      console.error("Error initiating refund:", error);
      toast({
        title: "Error",
        description: "Failed to initiate refund. Please try again.",
        variant: "destructive",
      });
    }
  };

  const closeAllDialogs = () => {
    setPackingDialogOpen(false);
    setShippingDialogOpen(false);
    setCancelDialogOpen(false);
    setReturnQCDialogOpen(false);
    setReturnCourierDialogOpen(false);
    resetCourierForm();
    setCancelReason("");
    setQCDetails({ result: "", remarks: "" });
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      "pending": "bg-gray-100 text-gray-800",
      "confirmed": "bg-blue-100 text-blue-800",
      "packed": "bg-orange-100 text-orange-800",
      "shipped": "bg-purple-100 text-purple-800",
      "delivered": "bg-green-100 text-green-800",
      "cancelled": "bg-red-100 text-red-800",
      "returned": "bg-yellow-100 text-yellow-800",
      "refunded": "bg-indigo-100 text-indigo-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  const getReturnStatusColor = (status: string) => {
    const returnStatusColors: { [key: string]: string } = {
      "initiated": "bg-blue-100 text-blue-800",
      "seller_review": "bg-yellow-100 text-yellow-800", 
      "pickup_scheduled": "bg-orange-100 text-orange-800",
      "picked_up": "bg-purple-100 text-purple-800",
      "quality_check": "bg-indigo-100 text-indigo-800",
      "approved": "bg-green-100 text-green-800",
      "rejected": "bg-red-100 text-red-800",
      "refunded": "bg-teal-100 text-teal-800",
      "completed": "bg-emerald-100 text-emerald-800",
    };
    return returnStatusColors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading comprehensive order details...</p>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-3xl font-bold text-gray-900">
                Order #{order.order_id.slice(0, 8)}
              </h1>
              <p className="text-gray-600">
                Created: {new Date(order.created_at!).toLocaleString()}
              </p>
            </div>
            
            <Badge className={getStatusColor(order.status)}>
              <span className="capitalize">{order.status}</span>
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Order Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.order_item_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.seller_title || "Product"}</h4>
                        <p className="text-sm text-gray-600">
                          SKU: {item.sku || "N/A"} | Variant: {item.variant_name || "Default"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity} × ₹{item.price_per_unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{item.subtotal}</p>
                        <Badge className={getStatusColor(item.status || "pending")}>
                          {item.status || "pending"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Tracking Timeline */}
            {orderTracking.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Order Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderTracking.map((track) => (
                      <div key={track.tracking_id} className="flex items-start gap-4 p-3 border-l-4 border-blue-500 bg-blue-50 rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(track.status)}>
                              {track.status}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(track.updated_at!).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{track.location}</p>
                          {track.notes && <p className="text-xs text-gray-600 mt-1">{track.notes}</p>}
                          {track.url && (
                            <a href={track.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">
                              Track Package →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status History */}
            {orderStatusHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Status History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orderStatusHistory.map((history) => (
                      <div key={history.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="text-sm font-medium">
                            {history.old_status} → {history.new_status}
                          </span>
                          {history.remarks && <p className="text-xs text-gray-600">{history.remarks}</p>}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(history.changed_at!).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cancellations & Refunds */}
            {(orderCancellations.length > 0 || orderRefunds.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Cancellations & Refunds
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {orderCancellations.map((cancellation) => (
                    <div key={cancellation.cancellation_id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-red-800">Order Cancelled</p>
                          <p className="text-sm text-red-600">By: {cancellation.cancelled_by_role}</p>
                          <p className="text-sm text-red-600">Reason: {cancellation.reason}</p>
                        </div>
                        <Badge variant="destructive">{cancellation.refund_status}</Badge>
                      </div>
                    </div>
                  ))}
                  
                  {orderRefunds.map((refund) => (
                    <div key={refund.refund_id} className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-blue-800">Refund Processed</p>
                          <p className="text-sm text-blue-600">Amount: ₹{refund.amount}</p>
                          <p className="text-sm text-blue-600">Method: {refund.method}</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">{refund.status}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Customer & Action Details */}
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
                  <div className="font-medium">{buyer?.full_name || buyer?.email || "N/A"}</div>
                  <div className="text-muted-foreground text-xs">{buyer?.email || "Email: N/A"}</div>
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
                  <div className="mt-2">Payment: <strong className="capitalize">{order.payment_status || 'prepaid'}</strong></div>
                  <div>Delivery ETA: <strong>{new Date(new Date(order.created_at!).getTime() + 7*24*60*60*1000).toLocaleDateString()}</strong></div>
                  <div>Courier: <strong>{orderTracking[0]?.notes?.includes('Courier:') ? orderTracking[0].notes.split('Courier:')[1].split('.')[0].trim() : 'Not Assigned'}</strong></div>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Item Total:</span>
                  <span>₹{order.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>{order.shipping_cost ? `₹${order.shipping_cost.toFixed(2)}` : '₹0 (Free)'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-₹{order.discount_amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Marketplace Fee:</span>
                  <span>₹{computeMarketplaceFee(order.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Seller Earnings:</span>
                  <span>₹{(order.total_amount - computeMarketplaceFee(order.total_amount)).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Returns & Quality Check */}
            {orderReturns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Returns & Quality Check</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {orderReturns.map((returnItem) => {
                    const qcRecord = returnQualityChecks.find(qc => qc.return_id === returnItem.return_id);
                    const trackingRecords = returnTracking.filter(rt => rt.return_id === returnItem.return_id);
                    
                    return (
                      <div key={returnItem.return_id} className="p-3 border rounded-lg space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">Return Request</p>
                            <p className="text-sm text-gray-600">Reason: {returnItem.reason}</p>
                            <p className="text-sm text-gray-600">Type: {returnItem.return_type}</p>
                          </div>
                          <Badge className={getReturnStatusColor(returnItem.status)}>
                            {returnItem.status}
                          </Badge>
                        </div>

                        {/* Return Tracking */}
                        {trackingRecords.length > 0 && (
                          <div className="text-xs bg-gray-50 p-2 rounded">
                            <p className="font-medium mb-1">Return Tracking:</p>
                            {trackingRecords.map((track) => (
                              <div key={track.return_tracking_id} className="flex justify-between">
                                <span>{track.status} - {track.location}</span>
                                <span>{new Date(track.updated_at!).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* QC Result */}
                        {qcRecord && (
                          <div className={`text-xs p-2 rounded ${qcRecord.result === 'passed' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                            <p className="font-medium">QC Result: {qcRecord.result}</p>
                            {qcRecord.remarks && <p>Remarks: {qcRecord.remarks}</p>}
                            <p>Checked: {new Date(qcRecord.checked_at!).toLocaleDateString()}</p>
                          </div>
                        )}

                        {/* Return Actions */}
                        <div className="flex gap-2 flex-wrap">
                          {returnItem.status === "initiated" && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedReturnId(returnItem.return_id);
                                  setReturnCourierDialogOpen(true);
                                }}
                              >
                                Assign Pickup
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedReturnId(returnItem.return_id);
                                  setReturnQCDialogOpen(true);
                                }}
                              >
                                Start QC
                              </Button>
                            </>
                          )}
                          
                          {returnItem.status === "picked_up" && !qcRecord && (
                            <Button 
                              size="sm"
                              onClick={() => {
                                setSelectedReturnId(returnItem.return_id);
                                setReturnQCDialogOpen(true);
                              }}
                            >
                              Perform QC
                            </Button>
                          )}
                          
                          {returnItem.status === "approved" && (
                            <Button 
                              size="sm" 
                              onClick={() => handleInitiateRefund(returnItem.return_id)}
                            >
                              Initiate Refund
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Order Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Order Actions</CardTitle>
                <p className="text-sm text-muted-foreground">Current Status: <strong>{order.status}</strong></p>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.status === "confirmed" && (
                  <Dialog open={packingDialogOpen} onOpenChange={setPackingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        📦 Mark as Packed
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Mark as Packed - Assign Courier</DialogTitle>
                        <DialogDescription>
                          Enter comprehensive courier details for order tracking
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="consignment">Consignment Number *</Label>
                          <Input
                            id="consignment"
                            value={courierDetails.consignmentNumber}
                            onChange={(e) => setCourierDetails({...courierDetails, consignmentNumber: e.target.value})}
                            placeholder="Enter consignment number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="trackingUrl">Tracking URL</Label>
                          <Input
                            id="trackingUrl"
                            value={courierDetails.trackingUrl}
                            onChange={(e) => setCourierDetails({...courierDetails, trackingUrl: e.target.value})}
                            placeholder="https://track.courier.com/..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="courierPartner">Courier Partner *</Label>
                          <Select 
                            value={courierDetails.courierPartner} 
                            onValueChange={(value) => setCourierDetails({...courierDetails, courierPartner: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select courier" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bluedart">BlueDart</SelectItem>
                              <SelectItem value="dtdc">DTDC</SelectItem>
                              <SelectItem value="delhivery">Delhivery</SelectItem>
                              <SelectItem value="fedex">FedEx</SelectItem>
                              <SelectItem value="ecom">Ecom Express</SelectItem>
                              <SelectItem value="xpressbees">XpressBees</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="courierPhone">Courier Phone *</Label>
                          <Input
                            id="courierPhone"
                            value={courierDetails.courierPhone}
                            onChange={(e) => setCourierDetails({...courierDetails, courierPhone: e.target.value})}
                            placeholder="Courier contact number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="courierEmail">Courier Email</Label>
                          <Input
                            id="courierEmail"
                            value={courierDetails.courierEmail}
                            onChange={(e) => setCourierDetails({...courierDetails, courierEmail: e.target.value})}
                            placeholder="courier@company.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="estimatedDelivery">Estimated Delivery</Label>
                          <Input
                            id="estimatedDelivery"
                            type="datetime-local"
                            value={courierDetails.estimatedDelivery}
                            onChange={(e) => setCourierDetails({...courierDetails, estimatedDelivery: e.target.value})}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="courierAddress">Courier Address</Label>
                          <Input
                            id="courierAddress"
                            value={courierDetails.courierAddress}
                            onChange={(e) => setCourierDetails({...courierDetails, courierAddress: e.target.value})}
                            placeholder="Courier hub/office address"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pickupDate">Pickup Date</Label>
                          <Input
                            id="pickupDate"
                            type="date"
                            value={courierDetails.pickupDate}
                            onChange={(e) => setCourierDetails({...courierDetails, pickupDate: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
                          <Input
                            id="deliveryInstructions"
                            value={courierDetails.deliveryInstructions}
                            onChange={(e) => setCourierDetails({...courierDetails, deliveryInstructions: e.target.value})}
                            placeholder="Special delivery notes"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="notes">Additional Notes</Label>
                          <Textarea
                            id="notes"
                            value={courierDetails.notes}
                            onChange={(e) => setCourierDetails({...courierDetails, notes: e.target.value})}
                            placeholder="Any additional notes for tracking..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setPackingDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleMarkAsPacked} disabled={updating}>
                          {updating ? "Processing..." : "Mark as Packed"}
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

                {!["delivered", "cancelled", "refunded"].includes(order.status) && (
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
                          Please provide a detailed reason for cancellation
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="reason">Cancellation Reason *</Label>
                          <Textarea
                            id="reason"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Enter detailed reason for cancellation..."
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
              </CardContent>
            </Card>

            {/* Payment Details */}
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
                  <span>Final Amount:</span>
                  <span>₹{order.final_amount?.toFixed(2) || '0.00'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Return QC Dialog */}
        <Dialog open={returnQCDialogOpen} onOpenChange={setReturnQCDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Return Quality Check</DialogTitle>
              <DialogDescription>
                Perform quality check on returned item
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="qcResult">QC Result *</Label>
                <Select 
                  value={qcDetails.result} 
                  onValueChange={(value) => setQCDetails({...qcDetails, result: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select QC result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passed">✅ Passed</SelectItem>
                    <SelectItem value="failed">❌ Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="qcRemarks">QC Remarks</Label>
                <Textarea
                  id="qcRemarks"
                  value={qcDetails.remarks}
                  onChange={(e) => setQCDetails({...qcDetails, remarks: e.target.value})}
                  placeholder="Detailed QC observations..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReturnQCDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleReturnQC(selectedReturnId, qcDetails.result as "passed" | "failed")} 
                disabled={!qcDetails.result}
              >
                Submit QC
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Return Courier Assignment Dialog */}
        <Dialog open={returnCourierDialogOpen} onOpenChange={setReturnCourierDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Return Pickup Courier</DialogTitle>
              <DialogDescription>
                Schedule courier for return item pickup
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="returnConsignment">Pickup Consignment Number *</Label>
                <Input
                  id="returnConsignment"
                  value={courierDetails.consignmentNumber}
                  onChange={(e) => setCourierDetails({...courierDetails, consignmentNumber: e.target.value})}
                  placeholder="Return pickup consignment"
                />
              </div>
              <div>
                <Label htmlFor="returnCourier">Courier Partner *</Label>
                <Select 
                  value={courierDetails.courierPartner} 
                  onValueChange={(value) => setCourierDetails({...courierDetails, courierPartner: value})}
                >
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
              <div>
                <Label htmlFor="returnCourierPhone">Courier Phone *</Label>
                <Input
                  id="returnCourierPhone"
                  value={courierDetails.courierPhone}
                  onChange={(e) => setCourierDetails({...courierDetails, courierPhone: e.target.value})}
                  placeholder="Courier contact for pickup"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReturnCourierDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleReturnCourierAssignment(selectedReturnId)}>
                Schedule Pickup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
