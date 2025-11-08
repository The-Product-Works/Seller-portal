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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Package, Search, Filter, Clock, CheckCircle2, AlertCircle, Truck, RotateCcw, ExternalLink, MapPin, DollarSign, History, RefreshCw, CheckCircle } from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";

interface OrderItemWithRelations {
  order_item_id: string;
  order_id: string;
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
  order_id: string;
  listing_id: string;
  variant_id: string | null;
  quantity: number;
  price_per_unit: number;
  subtotal: number | null;
  status: string | null;
  product_title?: string;
  variant_name?: string;
}

interface OrderTracking {
  tracking_id: string;
  status: string;
  url: string;
  location: string | null;
  notes: string | null;
  updated_at: string;
}

interface ReturnTracking {
  return_tracking_id: string;
  status: string;
  location: string | null;
  notes: string | null;
  updated_at: string;
}

interface OrderReturn {
  return_id: string;
  order_item_id: string;
  reason: string;
  return_type: 'replacement' | 'refund';
  status: string;
  initiated_at: string;
  updated_at: string;
  notes: string | null;
  tracking?: ReturnTracking;
}

interface OrderCancellation {
  cancellation_id: string;
  order_id: string;
  cancelled_by: string;
  cancelled_by_role: 'buyer' | 'seller' | 'admin';
  reason: string | null;
  refund_status: 'pending' | 'processed' | 'failed';
  cancelled_at: string;
}

interface OrderRefund {
  refund_id: string;
  order_id: string;
  processed_by: string | null;
  amount: number;
  method: string | null;
  status: string | null;
  processed_at: string | null;
  return_id: string | null;
  payment_id: string | null;
}

interface OrderStatusHistoryItem {
  id: string;
  changed_by: string | null;
  old_status: string | null;
  new_status: string | null;
  remarks: string | null;
  changed_at: string;
}

interface OrderFromDB {
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
  order_tracking?: OrderTracking[];
  order_returns?: OrderReturn[];
  order_cancellations?: OrderCancellation[];
  order_refunds?: OrderRefund[];
  payments?: PaymentInfo[];
  order_status_history?: OrderStatusHistoryItem[];
}

interface OrderStatusHistory {
  id: string;
  order_id: string;
  changed_by: string | null;
  old_status: string | null;
  new_status: string | null;
  remarks: string | null;
  changed_at: string;
}

interface PaymentInfo {
  payment_id: string;
  method: string | null;
  amount: number;
  status: string;
  transaction_ref: string | null;
  payment_gateway: string | null;
  paid_at: string | null;
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
  tracking?: OrderTracking;
  returns?: OrderReturn[];
  cancellation?: OrderCancellation;
  refunds?: OrderRefund[];
  payment?: PaymentInfo;
  status_history?: OrderStatusHistory[];
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
  const [filter, setFilter] = useState<"all" | "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "returned">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid" | "refunded">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ordersPerPage = 10;
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  
  // Dialog states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [returnActionDialogOpen, setReturnActionDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  
  // Form states
  const [cancelReason, setCancelReason] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [trackingLocation, setTrackingLocation] = useState("");
  const [trackingNotes, setTrackingNotes] = useState("");
  const [selectedReturn, setSelectedReturn] = useState<OrderReturn | null>(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"original" | "wallet" | "manual">("original");
  const [refundTrackingId, setRefundTrackingId] = useState("");
  const [refundTrackingUrl, setRefundTrackingUrl] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [statusTrackingId, setStatusTrackingId] = useState("");
  const [statusTrackingUrl, setStatusTrackingUrl] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");

  useEffect(() => {
    loadOrders(1); // Reset to page 1 when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, statusFilter, dateFilter, searchQuery]);

  const cancelOrder = async (orderId: string, reason: string) => {
    try {
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) return;

      // Update order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: "cancelled", 
          updated_at: new Date().toISOString() 
        })
        .eq("order_id", orderId);

      if (orderError) {
        toast({
          title: "Error",
          description: "Failed to cancel order: " + orderError.message,
          variant: "destructive",
        });
        return;
      }

      // Insert cancellation record
      const { error: cancellationError } = await supabase
        .from("order_cancellations")
        .insert({
          order_id: orderId,
          cancelled_by: sellerId,
          cancelled_by_role: 'seller',
          reason: reason,
          refund_status: 'pending'
        });

      if (cancellationError) {
        console.error("Failed to record cancellation:", cancellationError);
      }

      // Record status history
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        changed_by: sellerId,
        old_status: "processing",
        new_status: "cancelled",
        remarks: `Order cancelled by seller. Reason: ${reason}`
      });

      toast({
        title: "Success",
        description: "Order cancelled successfully",
      });

      setCancelDialogOpen(false);
      setCancelReason("");
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

  const addOrderTracking = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("order_tracking")
        .insert({
          order_id: orderId,
          status: "shipped",
          url: trackingUrl,
          location: trackingLocation,
          notes: trackingNotes
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add tracking: " + error.message,
          variant: "destructive",
        });
        return;
      }

      // Update order status to shipped
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: "shipped", 
          updated_at: new Date().toISOString() 
        })
        .eq("order_id", orderId);

      if (orderError) {
        console.error("Failed to update order status:", orderError);
      }

      // Record status history
      const sellerId = await getAuthenticatedSellerId();
      if (sellerId) {
        await supabase.from("order_status_history").insert({
          order_id: orderId,
          changed_by: sellerId,
          old_status: "processing",
          new_status: "shipped",
          remarks: `Order shipped with tracking: ${trackingUrl}`
        });
      }

      toast({
        title: "Success",
        description: "Tracking information added successfully",
      });

      setTrackingDialogOpen(false);
      setTrackingUrl("");
      setTrackingLocation("");
      setTrackingNotes("");
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

  const processRefund = async (orderId: string, amount: number, method: string, trackingUrl?: string) => {
    try {
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) return;

      // Insert refund record
      const { error: refundError } = await supabase
        .from("order_refunds")
        .insert({
          order_id: orderId,
          processed_by: sellerId,
          amount: amount,
          method: method,
          status: 'completed',
          processed_at: new Date().toISOString()
        });

      if (refundError) {
        toast({
          title: "Error",
          description: "Failed to process refund: " + refundError.message,
          variant: "destructive",
        });
        return;
      }

      // Update order payment status to refunded
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          payment_status: "refunded",
          updated_at: new Date().toISOString() 
        })
        .eq("order_id", orderId);

      if (orderError) {
        console.error("Failed to update order payment status:", orderError);
      }

      // Update cancellation refund status if it exists
      const { error: cancellationError } = await supabase
        .from("order_cancellations")
        .update({ refund_status: 'processed' })
        .eq("order_id", orderId);

      if (cancellationError) {
        console.error("Failed to update cancellation refund status:", cancellationError);
      }

      // Add tracking for refund if provided
      if (trackingUrl) {
        await supabase.from("order_tracking").insert({
          order_id: orderId,
          status: "refund_processed",
          url: trackingUrl,
          location: "Refund Processing Center",
          notes: `Refund of ₹${amount} processed via ${method}`
        });
      }

      // Record status history
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        changed_by: sellerId,
        old_status: "cancelled",
        new_status: "refunded",
        remarks: `Refund processed: ₹${amount} via ${method}`
      });

      toast({
        title: "Success",
        description: "Refund processed successfully",
      });

      setRefundDialogOpen(false);
      setRefundAmount("");
      setRefundMethod("original");
      setRefundTrackingUrl("");
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

  const updateOrderStatus = async (orderId: string, status: string, remarks: string) => {
    try {
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) return;

      const currentOrder = orders.find(o => o.order_id === orderId);
      if (!currentOrder) return;

      // Update order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: status,
          updated_at: new Date().toISOString() 
        })
        .eq("order_id", orderId);

      if (orderError) {
        toast({
          title: "Error",
          description: "Failed to update order status: " + orderError.message,
          variant: "destructive",
        });
        return;
      }

      // Record status history
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        changed_by: sellerId,
        old_status: currentOrder.status,
        new_status: status,
        remarks: remarks
      });

      toast({
        title: "Success",
        description: `Order status updated to ${status}`,
      });

      setStatusUpdateDialogOpen(false);
      setNewStatus("");
      setStatusRemarks("");
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

  const processRefundForReturn = async (returnId: string, orderId: string) => {
    try {
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) return;

      // First approve the return
      const { error: returnError } = await supabase
        .from("order_returns")
        .update({ 
          status: "approved",
          updated_at: new Date().toISOString() 
        })
        .eq("return_id", returnId);

      if (returnError) {
        toast({
          title: "Error",
          description: "Failed to approve return: " + returnError.message,
          variant: "destructive",
        });
        return;
      }

      // Process refund
      const { error: refundError } = await supabase
        .from("order_refunds")
        .insert({
          order_id: orderId,
          return_id: returnId,
          amount: parseFloat(refundAmount),
          status: "completed",
          processed_by: sellerId,
          method: "original",
          processed_at: new Date().toISOString(),
        });

      if (refundError) {
        toast({
          title: "Error",
          description: "Failed to process refund: " + refundError.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Return Approved & Refund Processed",
        description: `Return has been approved and refund of ₹${parseFloat(refundAmount).toFixed(2)} has been processed.`,
      });

      // Reset states
      setRefundDialogOpen(false);
      setRefundAmount("");
      setRefundTrackingId("");
      setRefundTrackingUrl("");
      setSelectedReturn(null);
      
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

  const handleReturnAction = async (returnId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      const { error } = await supabase
        .from("order_returns")
        .update({ 
          status: newStatus,
          notes: notes || null,
          updated_at: new Date().toISOString() 
        })
        .eq("return_id", returnId);

      if (error) {
        toast({
          title: "Error",
          description: `Failed to ${action} return: ` + error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Return ${action}d successfully`,
      });

      setReturnActionDialogOpen(false);
      setSelectedReturn(null);
      setReturnNotes("");
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

  const loadOrders = async (page = 1) => {
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

      // Build filters for the query
      let query = supabase
        .from("orders")
        .select("*", { count: "exact" })
        .eq("seller_id", id);

      // Apply status filter
      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      // Apply payment status filter
      if (statusFilter !== "all") {
        query = query.eq("payment_status", statusFilter);
      }

      // Apply date filter
      if (dateFilter !== "all") {
        const today = new Date();
        let dateThreshold: Date;
        
        switch (dateFilter) {
          case "today":
            dateThreshold = new Date(today.setHours(0, 0, 0, 0));
            break;
          case "week":
            dateThreshold = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            dateThreshold = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            dateThreshold = new Date(0);
        }
        query = query.gte("created_at", dateThreshold.toISOString());
      }

      // Apply search filter if provided
      if (searchQuery.trim()) {
        query = query.or(`order_id.ilike.%${searchQuery}%,buyer_id.ilike.%${searchQuery}%`);
      }

      // Get total count with filters
      const { count: totalCount } = await query;
      setTotalOrders(totalCount || 0);

      // Calculate pagination offset
      const offset = (page - 1) * ordersPerPage;

      // Fetch actual data with pagination
      const dataQuery = supabase
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
          address_id,
          order_tracking(tracking_id, status, url, location, notes, updated_at),
          order_returns(
            return_id, 
            order_item_id, 
            reason, 
            return_type, 
            status, 
            initiated_at, 
            updated_at, 
            notes,
            return_tracking(return_tracking_id, status, location, notes, updated_at)
          ),
          order_cancellations(
            cancellation_id,
            cancelled_by,
            cancelled_by_role,
            reason,
            refund_status,
            cancelled_at
          ),
          order_refunds(
            refund_id,
            amount,
            method,
            status,
            processed_at,
            return_id,
            payment_id
          ),
          payments(
            payment_id,
            method,
            amount,
            status,
            transaction_ref,
            payment_gateway,
            paid_at
          ),
          order_status_history(
            id,
            changed_by,
            old_status,
            new_status,
            remarks,
            changed_at
          )
        `
        )
        .eq("seller_id", id);

      // Apply the same filters to data query
      if (filter !== "all") {
        dataQuery.eq("status", filter);
      }
      if (statusFilter !== "all") {
        dataQuery.eq("payment_status", statusFilter);
      }
      if (dateFilter !== "all") {
        const today = new Date();
        let dateThreshold: Date;
        
        switch (dateFilter) {
          case "today":
            dateThreshold = new Date(today.setHours(0, 0, 0, 0));
            break;
          case "week":
            dateThreshold = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            dateThreshold = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            dateThreshold = new Date(0);
        }
        dataQuery.gte("created_at", dateThreshold.toISOString());
      }
      if (searchQuery.trim()) {
        dataQuery.or(`order_id.ilike.%${searchQuery}%,buyer_id.ilike.%${searchQuery}%`);
      }

      dataQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + ordersPerPage - 1);

      const { data: ordersData, error: ordersError } = await dataQuery;

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
            order_id,
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
            order_id: item.order_id,
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
      const formattedOrders: OrderDetail[] = (ordersData || []).map((order: OrderFromDB) => {
        const items = orderItemsData.filter((item) => item.order_id === order.order_id);
        const statusBadgeVariant = getStatusBadgeVariant(order.status);

        return {
          ...order,
          items: items,
          item_count: items.length,
          status_badge_variant: statusBadgeVariant,
          tracking: order.order_tracking?.[0] || null,
          returns: order.order_returns || [],
          cancellation: order.order_cancellations?.[0] || null,
          refunds: order.order_refunds || [],
          payment: order.payments?.[0] || null,
          status_history: (order.order_status_history || []).sort((a: OrderStatusHistoryItem, b: OrderStatusHistoryItem) => 
            new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
          )
        };
      });

      setOrders(formattedOrders);
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
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "delivered":
        return "default";
      case "processing":
      case "pending":
      case "shipped":
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
      case "shipped":
        return <Truck className="h-4 w-4" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  // Filter and search orders - now handled at database level
  const filteredOrders = orders;

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status?.toLowerCase() === "pending").length,
    processing: orders.filter((o) => o.status?.toLowerCase() === "processing").length,
    shipped: orders.filter((o) => o.status?.toLowerCase() === "shipped").length,
    delivered: orders.filter((o) => o.status?.toLowerCase() === "delivered").length,
    cancelled: orders.filter((o) => o.status?.toLowerCase() === "cancelled").length,
    refunded: orders.filter((o) => o.payment_status?.toLowerCase() === "refunded").length,
    returns: orders.reduce((acc, order) => acc + (order.returns?.length || 0), 0),
    refunds: orders.reduce((acc, order) => acc + (order.refunds?.length || 0), 0)
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Shipped</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.shipped}</div>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Refunded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">{stats.refunded}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.returns}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Refund Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.refunds}</div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">₹{totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">
                  Search orders
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by Order ID, Buyer ID, or Product..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="status-filter" className="text-sm font-medium mb-2 block">
                    Order Status
                  </Label>
                  <Select value={filter} onValueChange={(value: string) => setFilter(value as "all" | "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "returned")}>
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="Filter by order status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment-filter" className="text-sm font-medium mb-2 block">
                    Payment Status
                  </Label>
                  <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as "all" | "paid" | "unpaid" | "refunded")}>
                    <SelectTrigger id="payment-filter">
                      <SelectValue placeholder="Filter by payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date-filter" className="text-sm font-medium mb-2 block">
                    Date Range
                  </Label>
                  <Select value={dateFilter} onValueChange={(value: string) => setDateFilter(value as "all" | "today" | "week" | "month")}>
                    <SelectTrigger id="date-filter">
                      <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Showing {orders.length} of {totalOrders} orders (Page {currentPage} of {Math.ceil(totalOrders / ordersPerPage)})
                </p>
              </div>
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
                        {order.returns && order.returns.length > 0 && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <RotateCcw className="h-3 w-3" />
                            {order.returns.length} Return{order.returns.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
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

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" onClick={() => setSelectedOrder(order)}>
                            View Details
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:w-[600px] overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>Order Details</SheetTitle>
                            <SheetDescription>
                              Order #{order.order_id.substring(0, 8).toUpperCase()}
                            </SheetDescription>
                          </SheetHeader>

                          {selectedOrder?.order_id === order.order_id && (
                            <div className="mt-6 space-y-6">
                              {/* Order Status & Actions */}
                              <div className="space-y-2">
                                <h3 className="font-semibold">Status & Actions</h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant={order.status_badge_variant} className="flex items-center gap-1 w-fit">
                                    {getStatusIcon(order.status)}
                                    {order.status}
                                  </Badge>
                                  
                                  {/* Action buttons based on status */}
                                  {order.status?.toLowerCase() === "processing" && (
                                    <div className="flex gap-2 flex-wrap">
                                      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                                        <DialogTrigger asChild>
                                          <Button variant="destructive" size="sm">
                                            <AlertCircle className="h-4 w-4 mr-2" />
                                            Cancel Order
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Cancel Order</DialogTitle>
                                            <DialogDescription>
                                              Are you sure you want to cancel this order? Please provide a reason.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <div>
                                              <Label htmlFor="cancel-reason">Reason for cancellation</Label>
                                              <Textarea
                                                id="cancel-reason"
                                                placeholder="Enter reason for cancelling this order..."
                                                value={cancelReason}
                                                onChange={(e) => setCancelReason(e.target.value)}
                                              />
                                            </div>
                                          </div>
                                          <DialogFooter>
                                            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                                              Cancel
                                            </Button>
                                            <Button 
                                              variant="destructive" 
                                              onClick={() => cancelOrder(order.order_id, cancelReason)}
                                              disabled={!cancelReason.trim()}
                                            >
                                              Cancel Order
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                      
                                      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="sm" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
                                            <Truck className="h-4 w-4 mr-2" />
                                            Ship Order
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Ship Order</DialogTitle>
                                            <DialogDescription>
                                              Add tracking details to ship this order.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <div>
                                              <Label htmlFor="tracking-url">Tracking URL</Label>
                                              <Input
                                                id="tracking-url"
                                                placeholder="https://tracking.company.com/track/123456"
                                                value={trackingUrl}
                                                onChange={(e) => setTrackingUrl(e.target.value)}
                                              />
                                            </div>
                                            <div>
                                              <Label htmlFor="tracking-location">Current Location</Label>
                                              <Input
                                                id="tracking-location"
                                                placeholder="Shipped from warehouse"
                                                value={trackingLocation}
                                                onChange={(e) => setTrackingLocation(e.target.value)}
                                              />
                                            </div>
                                            <div>
                                              <Label htmlFor="tracking-notes">Notes (optional)</Label>
                                              <Textarea
                                                id="tracking-notes"
                                                placeholder="Additional shipping information..."
                                                value={trackingNotes}
                                                onChange={(e) => setTrackingNotes(e.target.value)}
                                              />
                                            </div>
                                          </div>
                                          <DialogFooter>
                                            <Button variant="outline" onClick={() => setTrackingDialogOpen(false)}>
                                              Cancel
                                            </Button>
                                            <Button 
                                              onClick={() => addOrderTracking(order.order_id)}
                                              disabled={!trackingUrl.trim()}
                                            >
                                              Ship Order
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  )}
                                  
                                  {/* Mark as Delivered button for shipped orders */}
                                  {order.status?.toLowerCase() === "shipped" && (
                                    <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Mark as Delivered
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Mark Order as Delivered</DialogTitle>
                                          <DialogDescription>
                                            Confirm that this order has been delivered to the customer.
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <Label htmlFor="delivery-notes">Delivery Notes (Optional)</Label>
                                            <Textarea
                                              id="delivery-notes"
                                              placeholder="Add any delivery notes..."
                                              value={statusNotes}
                                              onChange={(e) => setStatusNotes(e.target.value)}
                                            />
                                          </div>
                                        </div>
                                        <DialogFooter>
                                          <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                                            Cancel
                                          </Button>
                                          <Button 
                                            onClick={() => updateOrderStatus(order.order_id, "delivered", statusNotes)}
                                          >
                                            Mark as Delivered
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                  
                                  {/* Return Request Actions for delivered orders */}
                                  {order.status?.toLowerCase() === "delivered" && order.returns && order.returns.some(r => r.status === 'initiated') && (
                                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                                      Return Request Pending
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Return Request Management */}
                              {order.returns && order.returns.some(r => r.status === 'initiated') && (
                                <div className="space-y-2">
                                  <h3 className="font-semibold flex items-center gap-2 text-orange-600">
                                    <RotateCcw className="h-4 w-4" />
                                    Pending Return Requests
                                  </h3>
                                  <div className="space-y-3">
                                    {order.returns.filter(r => r.status === 'initiated').map((returnItem) => (
                                      <div key={returnItem.return_id} className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium">Return #{returnItem.return_id.substring(0, 8).toUpperCase()}</span>
                                          <Badge variant="secondary">{returnItem.status}</Badge>
                                        </div>
                                        <div className="text-sm">
                                          <span className="font-medium">Reason:</span>
                                          <p className="text-muted-foreground mt-1">{returnItem.reason}</p>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                          <Dialog open={returnActionDialogOpen} onOpenChange={setReturnActionDialogOpen}>
                                            <DialogTrigger asChild>
                                              <Button 
                                                variant="destructive" 
                                                size="sm"
                                                onClick={() => setSelectedReturn(returnItem)}
                                              >
                                                Reject Return
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                              <DialogHeader>
                                                <DialogTitle>Reject Return Request</DialogTitle>
                                                <DialogDescription>
                                                  Provide a reason for rejecting this return request.
                                                </DialogDescription>
                                              </DialogHeader>
                                              <div className="space-y-4">
                                                <div>
                                                  <Label>Return Reason</Label>
                                                  <p className="text-sm text-muted-foreground">{selectedReturn?.reason}</p>
                                                </div>
                                                <div>
                                                  <Label htmlFor="reject-reason">Rejection Reason</Label>
                                                  <Textarea
                                                    id="reject-reason"
                                                    placeholder="Explain why you're rejecting this return..."
                                                    value={returnNotes}
                                                    onChange={(e) => setReturnNotes(e.target.value)}
                                                  />
                                                </div>
                                              </div>
                                              <DialogFooter>
                                                <Button variant="outline" onClick={() => setReturnActionDialogOpen(false)}>
                                                  Cancel
                                                </Button>
                                                <Button 
                                                  variant="destructive"
                                                  onClick={() => handleReturnAction(selectedReturn?.return_id || '', 'reject', returnNotes)}
                                                  disabled={!returnNotes.trim()}
                                                >
                                                  Reject Return
                                                </Button>
                                              </DialogFooter>
                                            </DialogContent>
                                          </Dialog>
                                          
                                          <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
                                            <DialogTrigger asChild>
                                              <Button 
                                                variant="outline" 
                                                size="sm"
                                                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                                onClick={() => {
                                                  setSelectedReturn(returnItem);
                                                  setRefundAmount(String(order.final_amount || order.total_amount));
                                                }}
                                              >
                                                Approve & Refund
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md">
                                              <DialogHeader>
                                                <DialogTitle>Approve Return & Process Refund</DialogTitle>
                                                <DialogDescription>
                                                  Approve the return and process refund for Order #{order.order_id.substring(0, 8).toUpperCase()}
                                                </DialogDescription>
                                              </DialogHeader>
                                              <div className="space-y-4">
                                                <div>
                                                  <Label htmlFor="refund-amount">Refund Amount</Label>
                                                  <Input
                                                    id="refund-amount"
                                                    type="number"
                                                    placeholder="Enter refund amount"
                                                    value={refundAmount}
                                                    onChange={(e) => setRefundAmount(e.target.value)}
                                                    max={order.final_amount || order.total_amount}
                                                  />
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    Max: ₹{(order.final_amount || order.total_amount).toFixed(2)}
                                                  </p>
                                                </div>
                                                <div>
                                                  <Label htmlFor="refund-tracking">Return Tracking ID</Label>
                                                  <Input
                                                    id="refund-tracking"
                                                    placeholder="Enter tracking ID for return shipment"
                                                    value={refundTrackingId}
                                                    onChange={(e) => setRefundTrackingId(e.target.value)}
                                                  />
                                                </div>
                                                <div>
                                                  <Label htmlFor="refund-tracking-url">Return Tracking URL</Label>
                                                  <Input
                                                    id="refund-tracking-url"
                                                    placeholder="https://tracking.company.com/track/123456"
                                                    value={refundTrackingUrl}
                                                    onChange={(e) => setRefundTrackingUrl(e.target.value)}
                                                  />
                                                </div>
                                              </div>
                                              <DialogFooter>
                                                <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
                                                  Cancel
                                                </Button>
                                                <Button 
                                                  onClick={() => processRefundForReturn(selectedReturn?.return_id || '', order.order_id)}
                                                  disabled={!refundAmount || !refundTrackingId.trim()}
                                                >
                                                  Approve & Process Refund
                                                </Button>
                                              </DialogFooter>
                                            </DialogContent>
                                          </Dialog>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Tracking Information */}
                              {order.tracking && (
                                <div className="space-y-2">
                                  <h3 className="font-semibold flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    Tracking Information
                                  </h3>
                                  <div className="bg-muted rounded-lg p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">Status:</span>
                                      <Badge variant="secondary">{order.tracking.status}</Badge>
                                    </div>
                                    {order.tracking.location && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Location:</span>
                                        <span className="text-sm flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {order.tracking.location}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">Last Updated:</span>
                                      <span className="text-sm">{new Date(order.tracking.updated_at).toLocaleString()}</span>
                                    </div>
                                    <div className="pt-2">
                                      <Button variant="outline" size="sm" asChild>
                                        <a href={order.tracking.url} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="h-3 w-3 mr-2" />
                                          Track Package
                                        </a>
                                      </Button>
                                    </div>
                                    {order.tracking.notes && (
                                      <div className="pt-2 border-t">
                                        <span className="text-sm font-medium">Notes:</span>
                                        <p className="text-sm text-muted-foreground mt-1">{order.tracking.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Returns Information */}
                              {order.returns && order.returns.length > 0 && (
                                <div className="space-y-2">
                                  <h3 className="font-semibold flex items-center gap-2">
                                    <RotateCcw className="h-4 w-4" />
                                    Returns ({order.returns.length})
                                  </h3>
                                  <div className="space-y-3">
                                    {order.returns.map((returnItem) => (
                                      <div key={returnItem.return_id} className="bg-muted rounded-lg p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium">Return #{returnItem.return_id.substring(0, 8).toUpperCase()}</span>
                                          <Badge variant={returnItem.status === 'approved' ? 'default' : returnItem.status === 'rejected' ? 'destructive' : 'secondary'}>
                                            {returnItem.status}
                                          </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                          <div>
                                            <span className="font-medium">Type:</span> {returnItem.return_type}
                                          </div>
                                          <div>
                                            <span className="font-medium">Initiated:</span> {new Date(returnItem.initiated_at).toLocaleDateString()}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium">Reason:</span>
                                          <p className="text-sm text-muted-foreground mt-1">{returnItem.reason}</p>
                                        </div>
                                        
                                        {returnItem.status === 'initiated' && (
                                          <div className="flex gap-2 pt-2">
                                            <Dialog open={returnActionDialogOpen} onOpenChange={setReturnActionDialogOpen}>
                                              <DialogTrigger asChild>
                                                <Button 
                                                  variant="outline" 
                                                  size="sm"
                                                  onClick={() => setSelectedReturn(returnItem)}
                                                >
                                                  Review Return
                                                </Button>
                                              </DialogTrigger>
                                              <DialogContent>
                                                <DialogHeader>
                                                  <DialogTitle>Review Return Request</DialogTitle>
                                                  <DialogDescription>
                                                    Decide whether to approve or reject this return request.
                                                  </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                  <div>
                                                    <Label>Return Reason</Label>
                                                    <p className="text-sm text-muted-foreground">{selectedReturn?.reason}</p>
                                                  </div>
                                                  <div>
                                                    <Label htmlFor="return-notes">Notes (optional)</Label>
                                                    <Textarea
                                                      id="return-notes"
                                                      placeholder="Add notes about your decision..."
                                                      value={returnNotes}
                                                      onChange={(e) => setReturnNotes(e.target.value)}
                                                    />
                                                  </div>
                                                </div>
                                                <DialogFooter>
                                                  <Button 
                                                    variant="destructive" 
                                                    onClick={() => handleReturnAction(selectedReturn?.return_id || '', 'reject', returnNotes)}
                                                  >
                                                    Reject
                                                  </Button>
                                                  <Button 
                                                    onClick={() => handleReturnAction(selectedReturn?.return_id || '', 'approve', returnNotes)}
                                                  >
                                                    Approve
                                                  </Button>
                                                </DialogFooter>
                                              </DialogContent>
                                            </Dialog>
                                          </div>
                                        )}

                                        {returnItem.tracking && (
                                          <div className="mt-3 p-3 bg-background rounded border">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-sm font-medium">Return Tracking:</span>
                                              <Badge variant="outline">{returnItem.tracking.status}</Badge>
                                            </div>
                                            {returnItem.tracking.location && (
                                              <div className="text-sm text-muted-foreground">
                                                <MapPin className="h-3 w-3 inline mr-1" />
                                                {returnItem.tracking.location}
                                              </div>
                                            )}
                                            <div className="text-xs text-muted-foreground mt-1">
                                              Updated: {new Date(returnItem.tracking.updated_at).toLocaleString()}
                                            </div>
                                            {returnItem.tracking.notes && (
                                              <p className="text-sm text-muted-foreground mt-2">{returnItem.tracking.notes}</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Cancellation Details */}
                              {order.cancellation && (
                                <div className="space-y-2">
                                  <h3 className="font-semibold flex items-center gap-2 text-red-600">
                                    <AlertCircle className="h-4 w-4" />
                                    Cancellation Details
                                  </h3>
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="font-medium">Cancelled By:</span> {order.cancellation.cancelled_by_role}
                                      </div>
                                      <div>
                                        <span className="font-medium">Refund Status:</span> 
                                        <Badge variant={order.cancellation.refund_status === 'processed' ? 'default' : 'secondary'} className="ml-2">
                                          {order.cancellation.refund_status}
                                        </Badge>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="font-medium">Cancelled At:</span> {new Date(order.cancellation.cancelled_at).toLocaleString()}
                                      </div>
                                    </div>
                                    {order.cancellation.reason && (
                                      <div className="pt-2 border-t">
                                        <span className="text-sm font-medium">Reason:</span>
                                        <p className="text-sm text-muted-foreground mt-1">{order.cancellation.reason}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Payment Information */}
                              {order.payment && (
                                <div className="space-y-2">
                                  <h3 className="font-semibold flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    Payment Information
                                  </h3>
                                  <div className="bg-muted rounded-lg p-4 space-y-2">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="font-medium">Method:</span> {order.payment.method || 'N/A'}
                                      </div>
                                      <div>
                                        <span className="font-medium">Amount:</span> ₹{order.payment.amount.toFixed(2)}
                                      </div>
                                      <div>
                                        <span className="font-medium">Status:</span>
                                        <Badge variant={order.payment.status === 'success' ? 'default' : 'secondary'} className="ml-2">
                                          {order.payment.status}
                                        </Badge>
                                      </div>
                                      <div>
                                        <span className="font-medium">Gateway:</span> {order.payment.payment_gateway || 'N/A'}
                                      </div>
                                    </div>
                                    {order.payment.transaction_ref && (
                                      <div className="pt-2 border-t">
                                        <span className="text-sm font-medium">Transaction Ref:</span>
                                        <p className="text-sm text-muted-foreground mt-1">{order.payment.transaction_ref}</p>
                                      </div>
                                    )}
                                    {order.payment.paid_at && (
                                      <div className="text-xs text-muted-foreground">
                                        Paid at: {new Date(order.payment.paid_at).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

              {/* Refunds */}
              {order.refunds && order.refunds.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2 text-orange-600">
                    <DollarSign className="h-4 w-4" />
                    Refunds ({order.refunds.length})
                  </h3>
                  <div className="space-y-3">
                    {order.refunds.map((refund) => (
                      <div key={refund.refund_id} className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Refund #{refund.refund_id.substring(0, 8).toUpperCase()}</span>
                          <Badge variant={refund.status === 'completed' ? 'default' : refund.status === 'failed' ? 'destructive' : 'secondary'}>
                            {refund.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Amount:</span> ₹{refund.amount.toFixed(2)}
                          </div>
                          <div>
                            <span className="font-medium">Method:</span> {refund.method || "Original payment method"}
                          </div>
                          {refund.processed_at && (
                            <div className="col-span-2">
                              <span className="font-medium">Processed:</span> {new Date(refund.processed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last Updated: {new Date(refund.processed_at || Date.now()).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}                              {/* Status History */}
                              {order.status_history && order.status_history.length > 0 && (
                                <div className="space-y-2">
                                  <h3 className="font-semibold flex items-center gap-2">
                                    <History className="h-4 w-4" />
                                    Status History ({order.status_history.length})
                                  </h3>
                                  <div className="bg-muted rounded-lg p-4 max-h-60 overflow-y-auto">
                                    <div className="space-y-3">
                                      {order.status_history.map((history) => (
                                        <div key={history.id} className="border-l-2 border-primary pl-4 relative">
                                          <div className="absolute w-2 h-2 bg-primary rounded-full -left-1.5 top-1.5"></div>
                                          <div className="flex items-center justify-between">
                                            <div className="text-sm">
                                              <span className="font-medium">{history.old_status}</span>
                                              {history.old_status && history.new_status && ' → '}
                                              <span className="font-medium">{history.new_status}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {new Date(history.changed_at).toLocaleString()}
                                            </div>
                                          </div>
                                          {history.remarks && (
                                            <p className="text-xs text-muted-foreground mt-1">{history.remarks}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

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
                          )}
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalOrders > ordersPerPage && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(totalOrders / ordersPerPage)} 
                  ({totalOrders} total orders)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadOrders(1)}
                    disabled={currentPage === 1 || loading}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadOrders(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {/* Show page numbers around current page */}
                    {Array.from({ length: Math.min(5, Math.ceil(totalOrders / ordersPerPage)) }, (_, i) => {
                      const pageNum = Math.max(1, currentPage - 2) + i;
                      if (pageNum > Math.ceil(totalOrders / ordersPerPage)) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => loadOrders(pageNum)}
                          disabled={loading}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadOrders(currentPage + 1)}
                    disabled={currentPage === Math.ceil(totalOrders / ordersPerPage) || loading}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadOrders(Math.ceil(totalOrders / ordersPerPage))}
                    disabled={currentPage === Math.ceil(totalOrders / ordersPerPage) || loading}
                  >
                    Last
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