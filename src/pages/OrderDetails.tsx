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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { processDeliveryForPayout } from "@/lib/payout";

// Database type aliases for better readability
type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderReturn = Database['public']['Tables']['order_returns']['Row'];
type OrderTracking = Database['public']['Tables']['order_tracking']['Row'];
type OrderCancellation = Database['public']['Tables']['order_cancellations']['Row'];
type OrderRefund = Database['public']['Tables']['order_refunds']['Row'];
type ReturnTracking = Database['public']['Tables']['return_tracking']['Row'];
type ReturnQualityCheck = Database['public']['Tables']['return_quality_checks']['Row'];
type OrderStatusHistory = Database['public']['Tables']['order_status_history']['Row'];
type Seller = Database['public']['Tables']['sellers']['Row'];

interface Buyer {
  id: string;
  phone?: string;
  name?: string;
  full_name?: string;
  user_profiles?: {
    full_name?: string;
  };
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

export default function OrderDetails() {
  const { orderItemId } = useParams<{ orderItemId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Main data states
  const [orderItem, setOrderItem] = useState<OrderItem | null>(null);
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
  
  // Form states for comprehensive courier assignment
  const [courierDetails, setCourierDetails] = useState({
    consignmentNumber: "",
    trackingUrl: "",
    courierPartner: "",
    courierPhone: "",
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
    if (orderItemId) {
      loadOrderDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderItemId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const sellerId = await getAuthenticatedSellerId();
      
      if (!sellerId) {
        navigate("/");
        return;
      }

      console.log("🔍 Loading order item details:", orderItemId, "for seller:", sellerId);

      // Get order item with seller verification
      const { data: orderItemData, error: orderItemError } = await supabase
        .from("order_items")
        .select(`
          *,
          seller_product_listings ( seller_title ),
          listing_variants ( variant_name, sku )
        `)
        .eq("order_item_id", orderItemId)
        .eq("seller_id", sellerId)
        .single();

      if (orderItemError || !orderItemData) {
        console.error("❌ Order item query error:", orderItemError);
        toast({
          title: "Order item not found",
          description: "The order item you're looking for doesn't exist or you don't have access to it.",
          variant: "destructive",
        });
        navigate("/orders");
        return;
      }

      setOrderItem(orderItemData);

      // Get the parent order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("order_id", orderItemData.order_id)
        .single();

      if (orderError || !orderData) {
        console.error("❌ Order query error:", orderError);
        toast({
          title: "Order not found",
          description: "Parent order not found.",
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

      // Fetch all related data in parallel - using order_item_id
      const [
        buyerRes,
        addressRes,
        userProfileRes,
        returnsRes,
        trackingRes,
        cancellationsRes,
        refundsRes,
        statusHistoryRes,
        returnTrackingRes,
        returnQCRes
      ] = await Promise.all([
        supabase.from("users").select("id, phone").eq("id", orderData.buyer_id).maybeSingle(),
        orderData.address_id ? supabase.from("addresses").select("*").eq("address_id", orderData.address_id).single() : Promise.resolve({ data: null, error: null }),
        supabase.from("user_profiles").select("full_name, user_id").eq("user_id", orderData.buyer_id).maybeSingle(),
        supabase.from("order_returns").select("*").eq("order_item_id", orderItemData.order_item_id),
        supabase.from("order_tracking").select("*").eq("order_item_id", orderItemData.order_item_id).order("updated_at", { ascending: false }),
        supabase.from("order_cancellations").select("*").eq("order_item_id", orderItemData.order_item_id),
        supabase.from("order_refunds").select("*").eq("order_item_id", orderItemData.order_item_id),
        supabase.from("order_status_history").select("*").eq("order_item_id", orderItemData.order_item_id).order("changed_at", { ascending: false }),
        supabase.from("return_tracking").select("*").order("updated_at", { ascending: false }),
        supabase.from("return_quality_checks").select("*")
      ]);

      // Set all the data with proper error handling
      // Set shipping address first
      if (addressRes?.data && !addressRes.error) {
        setShippingAddress(addressRes.data as Address);
      }
      
      if (buyerRes?.data && !buyerRes.error) {
        // Merge buyer data with profile data
        const buyerData: Buyer = {
          ...buyerRes.data,
          user_profiles: userProfileRes?.data ? { full_name: userProfileRes.data.full_name } : undefined
        };
        setBuyer(buyerData as Buyer);
      } else {
        console.warn("⚠️ No buyer found in users table, using fallback data");
        
        // Try fetching user from address's user_id as fallback
        if (addressRes?.data && addressRes.data.user_id) {
          const { data: userFromAddress, error: userError } = await supabase
            .from("users")
            .select(`
              id,
              email,
              phone,
              user_profiles (
                full_name
              )
            `)
            .eq("id", addressRes.data.user_id)
            .maybeSingle();
          
          if (userFromAddress && !userError) {
            setBuyer(userFromAddress as Buyer);
          } else {
            // User doesn't exist in public.users table - use address data as final fallback
            setBuyer({
              id: addressRes.data.user_id,
              phone: addressRes.data.phone,
              user_profiles: {
                full_name: addressRes.data.name
              }
            } as Buyer);
          }
        }
      }
      
      // Set the single order item as items array for compatibility
      const mappedItem: ExtendedOrderItem = {
        ...orderItemData,
        seller_title: (orderItemData.seller_product_listings as { seller_title?: string })?.seller_title,
        sku: (orderItemData.listing_variants as { sku?: string })?.sku,
        variant_name: (orderItemData.listing_variants as { variant_name?: string })?.variant_name,
      };
      setItems([mappedItem]);
      
      if (returnsRes?.data && !returnsRes.error) setOrderReturns(returnsRes.data);
      if (trackingRes?.data && !trackingRes.error) setOrderTracking(trackingRes.data);
      if (cancellationsRes?.data && !cancellationsRes.error) setOrderCancellations(cancellationsRes.data);
      if (refundsRes?.data && !refundsRes.error) setOrderRefunds(refundsRes.data);
      if (statusHistoryRes?.data && !statusHistoryRes.error) setOrderStatusHistory(statusHistoryRes.data);
      if (returnTrackingRes?.data && !returnTrackingRes.error) setReturnTracking(returnTrackingRes.data);
      if (returnQCRes?.data && !returnQCRes.error) setReturnQualityChecks(returnQCRes.data);

    } catch (error) {
      console.error("❌ Error loading order item details:", error);
      toast({
        title: "Error loading order item",
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
      estimatedDelivery: "",
      courierAddress: "",
      pickupDate: "",
      deliveryInstructions: "",
      notes: "",
    });
  };

  const updateOrderStatus = async (newStatus: string, additionalData?: Record<string, unknown>) => {
    try {
      setUpdating(true);
      const sellerId = await getAuthenticatedSellerId();

      // Only update status in order_items table (no courier fields exist there)
      const { error: orderError } = await supabase
        .from("order_items")
        .update({ status: newStatus })
        .eq("order_item_id", orderItemId);

      if (orderError) throw orderError;

      // 💰 RECORD SELLER EARNING IF STATUS IS DELIVERED
      if (newStatus === "delivered" && sellerId && orderItemId) {
        const payoutResult = await processDeliveryForPayout({
          orderItemId: orderItemId,
          sellerId: sellerId,
        });

        if (payoutResult.success) {
          console.log("✅ Seller earning recorded:", payoutResult.message);
        } else {
          console.error("⚠️ Payout processing failed:", payoutResult.message);
          // Note: Order is still marked as delivered
          // Failed payout can be manually reconciled later
        }
      }

      // Add to status history with all additional details in remarks
      try {
        // Fetch user_id from sellers table
        let userId = null;
        if (sellerId) {
          const { data: sellerData } = await supabase
            .from("sellers")
            .select("user_id")
            .eq("id", sellerId)
            .single();
          
          userId = sellerData?.user_id || null;
        }

        // Build comprehensive remarks from additional data
        let remarks = `Status changed to ${newStatus}`;
        
        if (additionalData) {
          const detailParts: string[] = [];
          
          if (additionalData.courier_partner) detailParts.push(`Courier: ${additionalData.courier_partner}`);
          if (additionalData.tracking_number) detailParts.push(`Tracking: ${additionalData.tracking_number}`);
          if (additionalData.courier_phone) detailParts.push(`Phone: ${additionalData.courier_phone}`);
          if (additionalData.estimated_delivery) detailParts.push(`Est. Delivery: ${additionalData.estimated_delivery}`);
          if (additionalData.pickup_date) detailParts.push(`Pickup: ${additionalData.pickup_date}`);
          if (additionalData.notes) detailParts.push(`Notes: ${additionalData.notes}`);
          if (additionalData.cancel_reason) detailParts.push(`Reason: ${additionalData.cancel_reason}`);
          
          if (detailParts.length > 0) {
            remarks += `. ${detailParts.join(', ')}`;
          }
        }

        const { error: historyError } = await supabase
          .from("order_status_history")
          .insert({
            order_item_id: orderItemId!,
            changed_by: userId, // Use user_id from sellers table
            old_status: orderItem?.status || "",
            new_status: newStatus,
            remarks: remarks,
          });

        if (historyError) {
          console.warn("Could not add status history:", historyError);
          // Log the full error for debugging
          console.error("Status history error details:", {
            error: historyError,
            data: {
              order_item_id: orderItemId,
              changed_by: userId,
              old_status: orderItem?.status,
              new_status: newStatus,
              remarks: remarks
            }
          });
        }
      } catch (historyError) {
        console.warn("Status history table may not exist:", historyError);
      }



      toast({
        title: "Order Updated",
        description: `Order item status changed to ${newStatus}`,
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
    try {
      // Simply update status to packed without courier details
      await updateOrderStatus("packed");

    } catch (error) {
      console.error("Error marking as packed:", error);
      toast({
        title: "Error",
        description: "Failed to mark as packed. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsShipped = async () => {
    // Validation for courier details
    if (!courierDetails.consignmentNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a consignment number.",
        variant: "destructive",
      });
      return;
    }

    if (!courierDetails.courierPartner.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a courier partner.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Build comprehensive tracking notes with all courier details
      const trackingNotes = [
        `Courier Partner: ${courierDetails.courierPartner}`,
        `Consignment Number: ${courierDetails.consignmentNumber}`,
        courierDetails.courierPhone ? `Courier Phone: ${courierDetails.courierPhone}` : null,
        courierDetails.estimatedDelivery ? `Est. Delivery: ${courierDetails.estimatedDelivery}` : null,
        courierDetails.pickupDate ? `Pickup Date: ${courierDetails.pickupDate}` : null,
        courierDetails.deliveryInstructions ? `Instructions: ${courierDetails.deliveryInstructions}` : null,
        courierDetails.notes ? `Additional Notes: ${courierDetails.notes}` : null,
      ].filter(Boolean).join('. ');

      // Insert tracking record with all courier details
      try {
        const { error: trackingError } = await supabase
          .from("order_tracking")
          .insert({
            order_item_id: orderItemId!,
            status: "shipped",
            url: courierDetails.trackingUrl || `https://track.courier.com/${courierDetails.consignmentNumber}`,
            location: "In Transit",
            notes: trackingNotes,
          });

        if (trackingError) console.warn("Could not create tracking record:", trackingError);
      } catch (trackingError) {
        console.warn("Tracking table may not exist:", trackingError);
      }

      // Update status with courier details
      await updateOrderStatus("shipped", {
        courier_partner: courierDetails.courierPartner,
        tracking_number: courierDetails.consignmentNumber,
        courier_phone: courierDetails.courierPhone,
        estimated_delivery: courierDetails.estimatedDelivery || null,
        pickup_date: courierDetails.pickupDate || null,
        notes: courierDetails.notes,
      });
    } catch (error) {
      console.error("Error shipping order item:", error);
    }
  };

  const handleMarkAsDelivered = async () => {
    try {
      // Simply update status to delivered - tracking entry was already created when shipped
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

      // Add cancellation record - with error handling
      try {
        const { error: cancellationError } = await supabase
          .from("order_cancellations")
          .insert({
            order_item_id: orderItemId!,
            cancelled_by: sellerId!,
            cancelled_by_role: "seller",
            reason: cancelReason,
            refund_status: "pending",
          });

        if (cancellationError) console.warn("Could not create cancellation record:", cancellationError);
      } catch (cancellationError) {
        console.warn("Cancellation table may not exist:", cancellationError);
      }

      await updateOrderStatus("cancelled", { cancel_reason: cancelReason });
    } catch (error) {
      console.error("Error cancelling order item:", error);
    }
  };

  const handleReturnQC = async (returnId: string, result: "passed" | "failed") => {
    try {
      // First check if the return is in an allowed state for seller updates
      const returnItem = orderReturns.find(r => r.return_id === returnId);
      const allowedStates = ["initiated", "seller_review", "pickup_scheduled", "picked_up", "quality_check", "approved", "rejected", "completed"];
      
      if (!returnItem || !allowedStates.includes(returnItem.status)) {
        toast({
          title: "Access Denied",
          description: `Cannot perform QC on return with status '${returnItem?.status}'. Only returns in specific workflow states can be updated by sellers.`,
          variant: "destructive",
        });
        return;
      }

      const sellerId = await getAuthenticatedSellerId();

      try {
        const { error: qcError } = await supabase
          .from("return_quality_checks")
          .insert({
            return_id: returnId,
            performed_by: sellerId!,
            result: result,
            remarks: qcDetails.remarks,
          });

        if (qcError) throw qcError;
      } catch (qcError) {
        console.warn("QC table may not exist:", qcError);
        toast({
          title: "QC Noted",
          description: `Return marked as ${result} (QC table not available)`,
        });
      }

      // Update return status based on QC result
      const newStatus = result === "passed" ? "approved" : "rejected";
      try {
        const { error: returnError } = await supabase
          .from("order_returns")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("return_id", returnId);

        if (returnError) throw returnError;
      } catch (returnError) {
        console.warn("Returns table may not exist:", returnError);
      }

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
    // First check if the return is in an allowed state for seller updates
    const returnItem = orderReturns.find(r => r.return_id === returnId);
    const allowedStates = ["initiated", "seller_review", "pickup_scheduled", "picked_up", "quality_check", "approved", "rejected", "completed"];
    
    if (!returnItem || !allowedStates.includes(returnItem.status)) {
      toast({
        title: "Access Denied",
        description: `Cannot assign courier for return with status '${returnItem?.status}'. Only returns in specific workflow states can be updated by sellers.`,
        variant: "destructive",
      });
      return;
    }

    if (!courierDetails.consignmentNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter consignment details for return pickup.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create return tracking record - with error handling
      try {
        const { error: trackingError } = await supabase
          .from("return_tracking")
          .insert({
            return_id: returnId,
            status: "pickup_scheduled",
            location: shippingAddress?.city || "Customer Location", 
            notes: `Return pickup scheduled. Courier: ${courierDetails.courierPartner}. Phone: ${courierDetails.courierPhone}. Consignment: ${courierDetails.consignmentNumber}`,
          });

        if (trackingError) throw trackingError;
      } catch (trackingError) {
        console.warn("Return tracking table may not exist:", trackingError);
      }

      // Update return status - with error handling
      try {
        const { error: returnError } = await supabase
          .from("order_returns")
          .update({ 
            status: "pickup_scheduled",
            updated_at: new Date().toISOString(),
            notes: `Pickup scheduled with ${courierDetails.courierPartner}`
          })
          .eq("return_id", returnId);

        if (returnError) throw returnError;
      } catch (returnError) {
        console.warn("Returns table may not exist:", returnError);
      }

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
    // First check if the return is in an allowed state for seller updates
    const returnItem = orderReturns.find(r => r.return_id === returnId);
    const allowedStates = ["initiated", "seller_review", "pickup_scheduled", "picked_up", "quality_check", "approved", "rejected", "completed"];
    
    if (!returnItem || !allowedStates.includes(returnItem.status)) {
      toast({
        title: "Access Denied",
        description: `Cannot initiate refund for return with status '${returnItem?.status}'. Only returns in specific workflow states can be updated by sellers.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const sellerId = await getAuthenticatedSellerId();

      try {
        const { error: refundError } = await supabase
          .from("order_refunds")
          .insert({
            order_item_id: orderItemId!,
            return_id: returnId,
            processed_by: sellerId!,
            amount: orderItem?.subtotal || 0,
            method: "original",
            status: "pending",
          });

        if (refundError) throw refundError;
      } catch (refundError) {
        console.warn("Refunds table may not exist:", refundError);
      }

      // Update return status
      try {
        const { error: returnError } = await supabase
          .from("order_returns")
          .update({ status: "refunded", updated_at: new Date().toISOString() })
          .eq("return_id", returnId);

        if (returnError) throw returnError;
      } catch (returnError) {
        console.warn("Returns table may not exist:", returnError);
      }

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
                Order Item #{orderItem?.order_item_id.slice(0, 8)}
              </h1>
              <p className="text-sm text-gray-600">
                Order: #{order.order_id.slice(0, 8)}
              </p>
              <p className="text-gray-600">
                Created: {new Date(order.created_at!).toLocaleString()}
              </p>
            </div>
            
            <Badge className={getStatusColor(orderItem?.status || "pending")}>
              <span className="capitalize">{orderItem?.status || "pending"}</span>
            </Badge>
          </div>
        </div>

        {/* Customer, Shipping & Summary - Full Width Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-2">
                <div>
                  <span className="font-medium text-gray-700">Customer:</span>
                  <p className="text-sm">
                    {buyer?.user_profiles?.full_name || 
                     buyer?.full_name || 
                     buyer?.name || 
                     shippingAddress?.name ||
                     "Customer Name"}
                  </p>
                </div>

                <div>
                  <span className="font-medium text-gray-700">Phone:</span>
                  <p className="text-sm">{buyer?.phone ? buyer.phone : "Not available"}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Customer ID:</span>
                  <p className="text-xs text-gray-600 break-all">{order.buyer_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-gray-700">Deliver To:</span>
                  <p className="font-medium text-sm">{shippingAddress?.name || buyer?.name || "Customer"}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Address:</span>
                  <div className="text-xs">
                    <p>{shippingAddress?.line1 || "Address not available"}</p>
                    {shippingAddress?.line2 && <p>{shippingAddress.line2}</p>}
                    <p>{shippingAddress?.city || "City"}, {shippingAddress?.state || "State"} {shippingAddress?.postal_code || "PIN"}</p>
                    <p>{shippingAddress?.country || "India"}</p>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Contact:</span>
                  <p className="text-sm">{shippingAddress?.phone || buyer?.phone || "Phone not available"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Earnings Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Seller's Item Subtotal */}
              <div className="space-y-2 pb-3 border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Item Subtotal:</span>
                  <span className="font-medium">₹{(orderItem?.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{orderItem?.quantity || 0} × ₹{(orderItem?.price_per_unit || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Marketplace Fee */}
              <div className="space-y-2 pb-3 border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Marketplace Fee (10%):</span>
                  <span className="font-medium text-red-600">-₹{computeMarketplaceFee(orderItem?.subtotal).toFixed(2)}</span>
                </div>
              </div>

              {/* Your Earnings */}
              <div className="flex justify-between font-bold text-base pt-1">
                <span className="text-green-700">Your Earnings:</span>
                <span className="text-green-600">₹{((orderItem?.subtotal || 0) - computeMarketplaceFee(orderItem?.subtotal)).toFixed(2)}</span>
              </div>

              {/* Order Totals (for reference) */}
              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Complete Order Totals:</p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Order Total:</span>
                  <span>₹{order.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Shipping:</span>
                  <span>{order.shipping_cost ? `₹${order.shipping_cost.toFixed(2)}` : '₹0'}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Discount Applied:</span>
                  <span>-₹{order.discount_amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-xs font-medium pt-1 border-t">
                  <span>Customer Paid:</span>
                  <span>₹{order.final_amount?.toFixed(2) || order.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Info message */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground italic">
                  💡 This order may contain items from multiple sellers. Only your item earnings are shown above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Tabbed Content - Takes 3 columns */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
                <TabsTrigger value="returns">Returns</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="refunds">Refunds</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
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
                            <p className="font-semibold">₹{item.subtotal || (item.quantity * item.price_per_unit)}</p>
                            <Badge className={getStatusColor(item.status || "pending")}>
                              {item.status || "pending"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tracking" className="space-y-6">
                {/* Order Tracking Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Order Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {orderTracking.length > 0 ? (
                        orderTracking.map((track) => (
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
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No tracking information available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="returns" className="space-y-6">
                {/* Returns Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Returns & Quality Check
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderReturns.length > 0 ? (
                      <div className="space-y-4">
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
                                {/* Only show actions if return is in allowed states for seller updates */}
                                {["initiated", "seller_review", "pickup_scheduled", "picked_up", "quality_check", "approved", "rejected", "completed"].includes(returnItem.status) && (
                                  <>
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
                                  </>
                                )}

                                {/* Show message if return is not in allowed states */}
                                {!["initiated", "seller_review", "pickup_scheduled", "picked_up", "quality_check", "approved", "rejected", "completed"].includes(returnItem.status) && (
                                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 w-full">
                                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                                    Return status '{returnItem.status}' is not eligible for seller updates. Only returns in specific workflow states can be managed by sellers.
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No returns for this order</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                {/* Status History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Status History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {orderStatusHistory.length > 0 ? (
                        orderStatusHistory.map((history) => (
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
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No status history available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="refunds" className="space-y-6">
                {/* Cancellations & Refunds */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Cancellations & Refunds
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {orderCancellations.length === 0 && orderRefunds.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No cancellations or refunds for this order</p>
                    ) : (
                      <>
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
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Order Actions - Takes 1 column */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-base">Order Actions</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Status: <Badge className={getStatusColor(orderItem?.status || "pending")}>{orderItem?.status || "pending"}</Badge>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {(orderItem?.status === "confirmed" || orderItem?.status === "pending") && (
                  <Button 
                    onClick={handleMarkAsPacked} 
                    disabled={updating}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    📦 Mark as Packed
                  </Button>
                )}

                {orderItem?.status === "packed" && (
                  <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        🚚 Mark as Shipped & Assign Courier
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Mark as Shipped - Assign Courier</DialogTitle>
                        <DialogDescription>
                          Enter comprehensive courier details for order tracking
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="ship-consignment">Consignment Number *</Label>
                          <Input
                            id="ship-consignment"
                            value={courierDetails.consignmentNumber}
                            onChange={(e) => setCourierDetails({...courierDetails, consignmentNumber: e.target.value})}
                            placeholder="Enter consignment number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="ship-trackingUrl">Tracking URL</Label>
                          <Input
                            id="ship-trackingUrl"
                            value={courierDetails.trackingUrl}
                            onChange={(e) => setCourierDetails({...courierDetails, trackingUrl: e.target.value})}
                            placeholder="https://track.courier.com/..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="ship-courierPartner">Courier Partner *</Label>
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
                          <Label htmlFor="ship-courierPhone">Courier Phone *</Label>
                          <Input
                            id="ship-courierPhone"
                            value={courierDetails.courierPhone}
                            onChange={(e) => setCourierDetails({...courierDetails, courierPhone: e.target.value})}
                            placeholder="Courier contact number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="ship-estimatedDelivery">Estimated Delivery</Label>
                          <Input
                            id="ship-estimatedDelivery"
                            type="datetime-local"
                            value={courierDetails.estimatedDelivery}
                            onChange={(e) => setCourierDetails({...courierDetails, estimatedDelivery: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="ship-pickupDate">Pickup Date</Label>
                          <Input
                            id="ship-pickupDate"
                            type="date"
                            value={courierDetails.pickupDate}
                            onChange={(e) => setCourierDetails({...courierDetails, pickupDate: e.target.value})}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="ship-deliveryInstructions">Delivery Instructions</Label>
                          <Input
                            id="ship-deliveryInstructions"
                            value={courierDetails.deliveryInstructions}
                            onChange={(e) => setCourierDetails({...courierDetails, deliveryInstructions: e.target.value})}
                            placeholder="Special delivery notes"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="ship-notes">Additional Notes</Label>
                          <Textarea
                            id="ship-notes"
                            value={courierDetails.notes}
                            onChange={(e) => setCourierDetails({...courierDetails, notes: e.target.value})}
                            placeholder="Any additional notes for tracking..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShippingDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleMarkAsShipped} disabled={updating}>
                          {updating ? "Processing..." : "Mark as Shipped"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {orderItem?.status === "shipped" && (
                  <Button 
                    onClick={handleMarkAsDelivered} 
                    disabled={updating}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    ✅ Mark as Delivered
                  </Button>
                )}

                {!["delivered", "cancelled", "refunded","returned"].includes(orderItem?.status || "") && (
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

                {/* Manual Status Change for Testing */}
                <div className="border-t pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="quickStatus" className="text-xs text-gray-600 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      Force Status Change (Advanced):
                    </Label>
                    <Select 
                      value={orderItem?.status || "pending"} 
                      onValueChange={(value) => {
                        if (confirm(`⚠️ WARNING: This will directly change the status to "${value}" without validations. Are you sure?`)) {
                          updateOrderStatus(value);
                        }
                      }}
                      disabled={updating}
                    >
                      <SelectTrigger id="quickStatus" className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">⏳ Pending</SelectItem>
                        <SelectItem value="confirmed">✅ Confirmed</SelectItem>
                        <SelectItem value="packed">📦 Packed</SelectItem>
                        <SelectItem value="shipped">🚚 Shipped</SelectItem>
                        <SelectItem value="delivered">✓ Delivered</SelectItem>
                        <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                        <SelectItem value="returned">↩️ Returned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-red-800">⚠️ DANGER: Advanced Quick Actions</p>
                        <p className="text-xs text-red-700 mt-1">
                          Changing status directly may skip important validations and courier information. 
                          Use only if you know what you're doing. Prefer using the standard action buttons above.
                        </p>
                      </div>
                    </div>
                  </div>
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
                Schedule courier for return item pickup from customer
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
                  placeholder={sellerDetails?.phone || "Courier contact for pickup"}
                />
              </div>
              {sellerDetails && (
                <div className="text-xs bg-gray-50 p-2 rounded">
                  <p className="font-medium">Using Seller Details:</p>
                  <p>Name: {sellerDetails.name}</p>
                  <p>Phone: {sellerDetails.phone}</p>

                  <p>Address: {sellerDetails.address_line1}, {sellerDetails.city}</p>
                </div>
              )}
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
