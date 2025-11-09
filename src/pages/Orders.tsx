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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Package, Search, Filter, CalendarIcon, Eye, Truck, CheckCircle, 
  Clock, AlertCircle, MapPin, Phone, Mail, User, RotateCcw, 
  Package2, FileText, RefreshCw 
} from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import type { Database } from "@/integrations/supabase/database.types";

// Database type aliases
type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
type OrderReturnRow = Database['public']['Tables']['order_returns']['Row'];

interface OrderItemWithDetails {
  order_item_id: string;
  order_id: string;
  listing_id: string;
  variant_id: string | null;
  seller_id: string;
  quantity: number;
  price_per_unit: number;
  subtotal: number | null;
  status: string | null;
  created_at: string | null;
  // Order details
  buyer_id: string;
  total_amount: number;
  shipping_cost: number | null;
  discount_amount: number | null;
  final_amount: number | null;
  payment_status: string | null;
  order_created_at: string;
  order_updated_at: string | null;
  // Product details
  product_name: string;
  product_variant: string;
  batch_code: string;
  return_status: string;
  // Relations
  users?: {
    email: string;
    phone: string | null;
  };
  addresses?: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    landmark?: string;
  };
  order_returns?: Array<{
    return_id: string;
    status: string;
  }>;
}

interface CourierDetails {
  courier_partner: string;
  consignment_number: string;
  tracking_url: string;
  courier_phone: string;
  courier_email: string;
  estimated_delivery: string;
  pickup_date: string;
  delivery_instructions: string;
  additional_notes: string;
}

export default function Orders() {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<OrderItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [returnStatusFilter, setReturnStatusFilter] = useState<string>("all");
  
  // Custom date range
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ordersPerPage = 15;

  // Dialog states for order management
  const [selectedOrder, setSelectedOrder] = useState<OrderItemWithDetails | null>(null);
  const [courierDialogOpen, setCourierDialogOpen] = useState(false);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  
  // Form states
  const [courierDetails, setCourierDetails] = useState<CourierDetails>({
    courier_partner: "",
    consignment_number: "",
    tracking_url: "",
    courier_phone: "",
    courier_email: "",
    estimated_delivery: "",
    pickup_date: "",
    delivery_instructions: "",
    additional_notes: "",
  });
  const [returnReason, setReturnReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  useEffect(() => {
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sellerId) {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, searchQuery, statusFilter, dateFilter, returnStatusFilter, dateRange, currentPage]);

  const initializeData = useCallback(async () => {
    console.log("🔑 Initializing seller authentication...");
    try {
      const seller_id = await getAuthenticatedSellerId();
      console.log("👤 Authenticated seller ID:", seller_id);
      if (!seller_id) {
        console.log("❌ No authenticated seller, redirecting to home");
        navigate("/");
        return;
      }
      setSellerId(seller_id);
    } catch (error) {
      console.error("💥 Error initializing data:", error);
      toast({
        title: "Error",
        description: "Failed to load seller information",
        variant: "destructive",
      });
    }
  }, [navigate, toast]);

  const loadOrders = useCallback(async () => {
    if (!sellerId) return;
    
    console.log("🔍 Loading order items for seller:", sellerId);
    
    try {
      setLoading(true);
      
      // First, try a simple query without joins
      const { data: simpleOrderItems, error: simpleError } = await supabase
        .from("order_items")
        .select("*")
        .eq("seller_id", sellerId)
        .limit(10);

      console.log("🔍 Simple order_items query:", { simpleOrderItems, simpleError });

      if (simpleError) {
        console.error("❌ Simple query failed:", simpleError);
        throw simpleError;
      }

      if (simpleOrderItems && simpleOrderItems.length === 0) {
        console.log("📭 No order items found for this seller");
        setOrders([]);
        setTotalOrders(0);
        return;
      }

      // Build the complex query - Query order_items with joins
      let query = supabase
        .from("order_items")
        .select(`
          order_item_id,
          order_id,
          listing_id,
          variant_id,
          seller_id,
          quantity,
          price_per_unit,
          subtotal,
          status,
          created_at,
          orders!inner (
            buyer_id,
            address_id,
            total_amount,
            shipping_cost,
            discount_amount,
            final_amount,
            payment_status,
            created_at,
            updated_at
          ),
          seller_product_listings (
            seller_title,
            listing_id
          ),
          listing_variants (
            variant_name,
            sku
          )
        `)
        .eq("seller_id", sellerId);

      console.log("📊 Query filters:", { statusFilter, dateFilter, returnStatusFilter, searchQuery });

      // Apply status filter on order_items.status
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply date filter on order_items.created_at
      if (dateFilter !== "all" && dateFilter !== "custom") {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = endOfDay(now);

        switch (dateFilter) {
          case "today":
            startDate = startOfDay(now);
            break;
          case "week":
            startDate = startOfWeek(now);
            endDate = endOfWeek(now);
            break;
          case "month":
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
          case "last_month": {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            startDate = startOfMonth(lastMonth);
            endDate = endOfMonth(lastMonth);
            break;
          }
          default:
            startDate = startOfDay(now);
        }

        query = query
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }

      // Apply custom date range
      if (dateFilter === "custom" && dateRange.from) {
        query = query.gte("created_at", startOfDay(dateRange.from).toISOString());
        
        if (dateRange.to) {
          query = query.lte("created_at", endOfDay(dateRange.to).toISOString());
        }
      }

      // Apply search filter on order_id or order_item_id
      if (searchQuery.trim()) {
        query = query.or(`order_id.ilike.%${searchQuery}%,order_item_id.ilike.%${searchQuery}%`);
      }

      // Get total count
      const { count } = await supabase
        .from("order_items")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", sellerId);

      console.log("📈 Total order items count:", count);

      setTotalOrders(count || 0);

      const offset = (currentPage - 1) * ordersPerPage;
      const { data: orderItemsData, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + ordersPerPage - 1);

      if (error) {
        console.error("❌ Database query error:", error);
        throw error;
      }

      console.log("📦 Raw order items data:", orderItemsData);

      if (!orderItemsData || orderItemsData.length === 0) {
        console.log("📭 No order items found after filtering");
        setOrders([]);
        return;
      }

      // For each order_item, we need to fetch buyer, address, and return details
      const orderItemsWithDetails = await Promise.all(
        orderItemsData.map(async (item: any) => {
          const order = item.orders;
          
          // Fetch buyer details
          const { data: userData } = await supabase
            .from("users")
            .select("email, phone")
            .eq("id", order.buyer_id)
            .maybeSingle();

          // Fetch address details
          const { data: addressData } = await supabase
            .from("addresses")
            .select("name, phone, line1, line2, city, state, postal_code, landmark")
            .eq("address_id", order.address_id)
            .maybeSingle();

          // Fetch return details for this order_item
          const { data: returnData } = await supabase
            .from("order_returns")
            .select("return_id, status")
            .eq("order_item_id", item.order_item_id);

          const productName = item.seller_product_listings?.seller_title || "Unknown Product";
          const variantName = item.listing_variants?.variant_name || "";
          const sku = item.listing_variants?.sku || item.listing_id || "";
          
          // Determine return status
          let returnStatus = "NA";
          const orderReturns = returnData || [];
          if (orderReturns.length > 0) {
            const latestReturn = orderReturns[0];
            switch (latestReturn.status) {
              case "initiated":
                returnStatus = "Return Requested";
                break;
              case "seller_review":
                returnStatus = "Under Review";
                break;
              case "pickup_scheduled":
                returnStatus = "Pickup Scheduled";
                break;
              case "picked_up":
                returnStatus = "In Return Transit";
                break;
              case "quality_check":
                returnStatus = "Under QC";
                break;
              case "approved":
                returnStatus = "Return Approved";
                break;
              case "rejected":
                returnStatus = "Return Rejected";
                break;
              case "refunded":
                returnStatus = "Refund Initiated";
                break;
              case "completed":
                returnStatus = "Return Closed";
                break;
            }
          }

          return {
            order_item_id: item.order_item_id,
            order_id: item.order_id,
            listing_id: item.listing_id,
            variant_id: item.variant_id,
            seller_id: item.seller_id,
            quantity: item.quantity,
            price_per_unit: item.price_per_unit,
            subtotal: item.subtotal,
            status: item.status || "pending",
            created_at: item.created_at,
            // Order details
            buyer_id: order.buyer_id,
            total_amount: order.total_amount,
            shipping_cost: order.shipping_cost,
            discount_amount: order.discount_amount,
            final_amount: order.final_amount,
            payment_status: order.payment_status,
            order_created_at: order.created_at,
            order_updated_at: order.updated_at,
            // Product details
            product_name: productName,
            product_variant: variantName,
            batch_code: sku,
            return_status: returnStatus,
            // Relations
            users: userData || undefined,
            addresses: addressData || undefined,
            order_returns: orderReturns,
          };
        })
      );

      console.log("🔄 Transformed order items:", orderItemsWithDetails);

      // Apply return status filter
      let filteredOrders = orderItemsWithDetails;
      if (returnStatusFilter !== "all") {
        filteredOrders = orderItemsWithDetails.filter(
          (item) => {
            if (returnStatusFilter === "na") return item.return_status === "NA";
            return item.return_status.toLowerCase().includes(returnStatusFilter.toLowerCase());
          }
        );
      }

      console.log("✅ Final filtered order items:", filteredOrders);
      setOrders(filteredOrders);

    } catch (error: any) {
      console.error("💥 Error loading order items:", error);
      toast({
        title: "Error",
        description: `Failed to load orders: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [sellerId, searchQuery, statusFilter, dateFilter, returnStatusFilter, dateRange, currentPage, toast]);

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "pending":
        return "secondary";
      case "confirmed":
        return "outline";
      case "packed":
        return "default";
      case "shipped":
        return "default";
      case "delivered":
        return "default";
      case "cancelled":
        return "destructive";
      case "returned":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getReturnStatusBadgeVariant = (returnStatus: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (returnStatus) {
      case "NA":
        return "outline";
      case "Return Requested":
        return "secondary";
      case "Return Approved":
        return "default";
      case "Return Rejected":
        return "destructive";
      case "In Return Transit":
        return "default";
      case "Under QC":
        return "secondary";
      case "Refund Initiated":
        return "default";
      case "QC Failed":
        return "destructive";
      case "Return Closed":
        return "outline";
      default:
        return "secondary";
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (!dateRange.from) {
      setDateRange({ from: date });
    } else if (!dateRange.to && date > dateRange.from) {
      setDateRange({ from: dateRange.from, to: date });
      setIsDatePickerOpen(false);
    } else {
      setDateRange({ from: date });
    }
  };

  const clearDateRange = () => {
    setDateRange({});
    setDateFilter("all");
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("all");
    setReturnStatusFilter("all");
    setDateRange({});
    setCurrentPage(1);
  };

  const handleViewOrder = (orderItemId: string) => {
    navigate(`/order-item/${orderItemId}`);
  };

  const handleOrderAction = (order: OrderItemWithDetails, action: string) => {
    setSelectedOrder(order);
    
    switch (action) {
      case "pack":
        setNewStatus("packed");
        setCourierDialogOpen(true);
        break;
      case "ship":
        setNewStatus("shipped");
        setCourierDialogOpen(true);
        break;
      case "deliver":
        setNewStatus("delivered");
        setStatusChangeDialogOpen(true);
        break;
      case "cancel":
        setNewStatus("cancelled");
        setStatusChangeDialogOpen(true);
        break;
      case "return":
        setReturnDialogOpen(true);
        break;
      case "refund":
        setRefundDialogOpen(true);
        break;
      case "details":
        setOrderDetailsOpen(true);
        break;
      default:
        break;
    }
  };

  const handleStatusChange = async () => {
    if (!selectedOrder) return;

    try {
      // Update order_item status
      const { error: statusError } = await supabase
        .from("order_items")
        .update({ 
          status: newStatus,
        })
        .eq("order_item_id", selectedOrder.order_item_id);

      if (statusError) throw statusError;

      // Add to order status history
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_item_id: selectedOrder.order_item_id,
          old_status: selectedOrder.status,
          new_status: newStatus,
          changed_by: sellerId,
          remarks: `Status changed to ${newStatus}`,
        });

      if (historyError) console.warn("Failed to log status history:", historyError);

      toast({
        title: "Status Updated",
        description: `Order item status changed to ${newStatus}`,
      });

      // Reload orders
      loadOrders();
      setStatusChangeDialogOpen(false);
      setSelectedOrder(null);

    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update order item status",
        variant: "destructive",
      });
    }
  };

  const handleCourierAssignment = async () => {
    if (!selectedOrder || !courierDetails.courier_partner || !courierDetails.consignment_number) {
      toast({
        title: "Missing Information",
        description: "Please fill in courier partner and consignment number",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update order_item status
      const { error: statusError } = await supabase
        .from("order_items")
        .update({ 
          status: newStatus,
        })
        .eq("order_item_id", selectedOrder.order_item_id);

      if (statusError) throw statusError;

      // Add tracking information
      const { error: trackingError } = await supabase
        .from("order_tracking")
        .insert({
          order_item_id: selectedOrder.order_item_id,
          url: courierDetails.tracking_url || "",
          status: newStatus === "packed" ? "ready_for_pickup" : "in_transit",
          location: "Seller Location",
          notes: `Courier: ${courierDetails.courier_partner}. Consignment: ${courierDetails.consignment_number}. ${courierDetails.additional_notes}`,
        });

      if (trackingError) throw trackingError;

      // Add to order status history
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_item_id: selectedOrder.order_item_id,
          old_status: selectedOrder.status,
          new_status: newStatus,
          changed_by: sellerId,
          remarks: `${newStatus} with courier ${courierDetails.courier_partner}`,
        });

      if (historyError) console.warn("Failed to log status history:", historyError);

      toast({
        title: "Order Updated",
        description: `Order item ${newStatus} and courier assigned successfully`,
      });

      // Reset form and close dialog
      setCourierDetails({
        courier_partner: "",
        consignment_number: "",
        tracking_url: "",
        courier_phone: "",
        courier_email: "",
        estimated_delivery: "",
        pickup_date: "",
        delivery_instructions: "",
        additional_notes: "",
      });

      // Reload orders
      loadOrders();
      setCourierDialogOpen(false);
      setSelectedOrder(null);

    } catch (error) {
      console.error("Error assigning courier:", error);
      toast({
        title: "Error",
        description: "Failed to assign courier and update status",
        variant: "destructive",
      });
    }
  };

  const handleReturnRequest = async () => {
    if (!selectedOrder || !returnReason) {
      toast({
        title: "Missing Information",
        description: "Please provide a return reason",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create return request for this specific order_item
      const { error: returnError } = await supabase
        .from("order_returns")
        .insert({
          order_item_id: selectedOrder.order_item_id,
          buyer_id: selectedOrder.buyer_id,
          seller_id: selectedOrder.seller_id,
          reason: returnReason,
          status: "initiated",
        });

      if (returnError) throw returnError;

      toast({
        title: "Return Initiated",
        description: "Return request has been created successfully",
      });

      // Reload orders
      loadOrders();
      setReturnDialogOpen(false);
      setReturnReason("");
      setSelectedOrder(null);

    } catch (error) {
      console.error("Error creating return:", error);
      toast({
        title: "Error",
        description: "Failed to create return request",
        variant: "destructive",
      });
    }
  };

  const getActionButtons = (order: OrderItemWithDetails) => {
    const buttons = [];

    switch (order.status) {
      case "confirmed":
        buttons.push(
          <Button
            key="pack"
            size="sm"
            variant="outline"
            onClick={() => handleOrderAction(order, "pack")}
            className="h-8"
          >
            <Package className="h-3 w-3 mr-1" />
            Pack
          </Button>
        );
        break;
      
      case "packed":
        buttons.push(
          <Button
            key="ship"
            size="sm"
            variant="outline"
            onClick={() => handleOrderAction(order, "ship")}
            className="h-8"
          >
            <Truck className="h-3 w-3 mr-1" />
            Ship
          </Button>
        );
        break;
      
      case "shipped":
        buttons.push(
          <Button
            key="deliver"
            size="sm"
            variant="outline"
            onClick={() => handleOrderAction(order, "deliver")}
            className="h-8"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Delivered
          </Button>
        );
        break;
      
      case "delivered":
        if (order.return_status === "NA") {
          buttons.push(
            <Button
              key="return"
              size="sm"
              variant="outline"
              onClick={() => handleOrderAction(order, "return")}
              className="h-8"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Return
            </Button>
          );
        }
        break;
    }

    // Cancel button for non-delivered orders
    if (!["delivered", "cancelled", "returned"].includes(order.status)) {
      buttons.push(
        <Button
          key="cancel"
          size="sm"
          variant="destructive"
          onClick={() => handleOrderAction(order, "cancel")}
          className="h-8"
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      );
    }

    return buttons;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
        <p className="text-gray-600 mt-2">Manage your orders, track shipments, and handle returns</p>
      </div>

      {/* Test Button for Debugging */}
      <Card className="mb-6 bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Debug Information</p>
              <p className="text-xs text-yellow-600">
                Seller ID: {sellerId || "Not loaded"} | 
                Orders Count: {orders.length} | 
                Total: {totalOrders} | 
                Loading: {loading ? "Yes" : "No"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log("🔄 Manual reload triggered");
                  loadOrders();
                }}
              >
                Reload Orders
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Order ID or Product name..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">New Order</SelectItem>
                  <SelectItem value="packed">Packed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Return Status Filter */}
            <div>
              <Label className="text-sm font-medium">Return Status</Label>
              <Select value={returnStatusFilter} onValueChange={setReturnStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Returns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="na">NA</SelectItem>
                  <SelectItem value="return requested">Return Requested</SelectItem>
                  <SelectItem value="return approved">Return Approved</SelectItem>
                  <SelectItem value="return rejected">Return Rejected</SelectItem>
                  <SelectItem value="in return transit">In Return Transit</SelectItem>
                  <SelectItem value="under qc">Under QC</SelectItem>
                  <SelectItem value="refund initiated">Refund Initiated</SelectItem>
                  <SelectItem value="qc failed">QC Failed</SelectItem>
                  <SelectItem value="return closed">Return Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div>
              <Label className="text-sm font-medium">Date Range</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Picker */}
            {dateFilter === "custom" && (
              <div>
                <Label className="text-sm font-medium">Custom Range</Label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          `${format(dateRange.from, "LLL dd")} - ${format(dateRange.to, "LLL dd")}`
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Pick dates"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                    {dateRange.from && (
                      <div className="p-3 border-t">
                        <Button size="sm" variant="outline" onClick={clearDateRange} className="w-full">
                          Clear Range
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {orders.length} of {totalOrders} orders
            </p>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders ({totalOrders})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Item ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product + Variant</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Return Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No orders found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.order_item_id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">
                        #{order.order_item_id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{order.order_id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), "dd MMM")}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{order.addresses?.name || "Unknown Customer"}</span>
                          </div>
                          {(order.addresses?.phone || order.users?.phone) && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {(order.addresses?.phone || order.users?.phone || "").replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3')}
                              </span>
                            </div>
                          )}
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="h-auto p-0 text-xs text-blue-600"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <MapPin className="h-3 w-3 mr-1" />
                                View Address
                              </Button>
                            </SheetTrigger>
                            <SheetContent>
                              <SheetHeader>
                                <SheetTitle>Customer Details</SheetTitle>
                                <SheetDescription>
                                  Complete customer and shipping information
                                </SheetDescription>
                              </SheetHeader>
                              <div className="space-y-4 mt-6">
                                <div>
                                  <h3 className="font-medium mb-2">Customer Information</h3>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      <span>{order.addresses?.name || "Unknown Customer"}</span>
                                    </div>
                                    {order.users?.email && (
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span>{order.users.email}</span>
                                      </div>
                                    )}
                                    {(order.addresses?.phone || order.users?.phone) && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span>{order.addresses?.phone || order.users?.phone}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {order.addresses && (
                                  <div>
                                    <h3 className="font-medium mb-2">Shipping Address</h3>
                                    <div className="text-sm space-y-1 p-3 bg-muted rounded-lg">
                                      <div className="font-medium">{order.addresses.name}</div>
                                      <div>{order.addresses.line1}</div>
                                      {order.addresses.line2 && <div>{order.addresses.line2}</div>}
                                      <div>{order.addresses.city}, {order.addresses.state}</div>
                                      <div>{order.addresses.postal_code}</div>
                                      {order.addresses.landmark && (
                                        <div className="text-muted-foreground">Near: {order.addresses.landmark}</div>
                                      )}
                                      <div className="flex items-center gap-1 mt-2">
                                        <Phone className="h-3 w-3" />
                                        <span>{order.addresses.phone}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </SheetContent>
                          </Sheet>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.product_name}</p>
                          {order.product_variant && (
                            <p className="text-sm text-muted-foreground">{order.product_variant}</p>
                          )}
                          <p className="text-xs text-muted-foreground font-mono">{order.batch_code}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{order.quantity}</TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <p className="font-medium">₹{(order.subtotal || (order.quantity * order.price_per_unit)).toFixed(0)}</p>
                          <p className="text-xs text-muted-foreground">Your earnings</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusBadgeVariant(order.status || "pending")}>
                          {order.status === "confirmed" ? "New Order" : 
                           order.status === "packed" ? "Packed" :
                           order.status === "shipped" ? "Shipped" :
                           order.status === "delivered" ? "Delivered" :
                           order.status === "cancelled" ? "Cancelled" :
                           order.status || "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getReturnStatusBadgeVariant(order.return_status)}>
                          {order.return_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(order.order_item_id)}
                            className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {getActionButtons(order)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
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
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || loading}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(totalOrders / ordersPerPage)) }, (_, i) => {
                    const pageNum = Math.max(1, currentPage - 2) + i;
                    if (pageNum > Math.ceil(totalOrders / ordersPerPage)) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
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
                  onClick={() => setCurrentPage(Math.min(Math.ceil(totalOrders / ordersPerPage), currentPage + 1))}
                  disabled={currentPage === Math.ceil(totalOrders / ordersPerPage) || loading}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.ceil(totalOrders / ordersPerPage))}
                  disabled={currentPage === Math.ceil(totalOrders / ordersPerPage) || loading}
                >
                  Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Courier Assignment Dialog */}
      <Dialog open={courierDialogOpen} onOpenChange={setCourierDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Courier</DialogTitle>
            <DialogDescription>
              Provide courier details for order {selectedOrder?.order_id.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="courier_partner">Courier Partner *</Label>
                <Select
                  value={courierDetails.courier_partner}
                  onValueChange={(value) => setCourierDetails({...courierDetails, courier_partner: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select courier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BlueDart">BlueDart</SelectItem>
                    <SelectItem value="FedEx">FedEx</SelectItem>
                    <SelectItem value="DHL">DHL</SelectItem>
                    <SelectItem value="DTDC">DTDC</SelectItem>
                    <SelectItem value="Ekart">Ekart</SelectItem>
                    <SelectItem value="Delhivery">Delhivery</SelectItem>
                    <SelectItem value="XpressBees">XpressBees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="consignment_number">Consignment Number *</Label>
                <Input
                  id="consignment_number"
                  value={courierDetails.consignment_number}
                  onChange={(e) => setCourierDetails({...courierDetails, consignment_number: e.target.value})}
                  placeholder="Enter tracking number"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="tracking_url">Tracking URL</Label>
              <Input
                id="tracking_url"
                value={courierDetails.tracking_url}
                onChange={(e) => setCourierDetails({...courierDetails, tracking_url: e.target.value})}
                placeholder="https://track.courier.com/..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="courier_phone">Courier Phone</Label>
                <Input
                  id="courier_phone"
                  value={courierDetails.courier_phone}
                  onChange={(e) => setCourierDetails({...courierDetails, courier_phone: e.target.value})}
                  placeholder="Courier contact number"
                />
              </div>
              <div>
                <Label htmlFor="estimated_delivery">Est. Delivery</Label>
                <Input
                  id="estimated_delivery"
                  type="date"
                  value={courierDetails.estimated_delivery}
                  onChange={(e) => setCourierDetails({...courierDetails, estimated_delivery: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="delivery_instructions">Delivery Instructions</Label>
              <Textarea
                id="delivery_instructions"
                value={courierDetails.delivery_instructions}
                onChange={(e) => setCourierDetails({...courierDetails, delivery_instructions: e.target.value})}
                placeholder="Special delivery instructions..."
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="additional_notes">Additional Notes</Label>
              <Textarea
                id="additional_notes"
                value={courierDetails.additional_notes}
                onChange={(e) => setCourierDetails({...courierDetails, additional_notes: e.target.value})}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourierDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCourierAssignment}>
              Assign Courier & {newStatus === "packed" ? "Mark as Packed" : "Mark as Shipped"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark order {selectedOrder?.order_id.slice(0, 8).toUpperCase()} as {newStatus}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusChangeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Request Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Return</DialogTitle>
            <DialogDescription>
              Create a return request for order {selectedOrder?.order_id.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="return_reason">Return Reason</Label>
              <Textarea
                id="return_reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Please provide the reason for return..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReturnRequest}>
              Create Return Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Process refund for order {selectedOrder?.order_id.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="refund_amount">Refund Amount</Label>
              <Input
                id="refund_amount"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
                max={selectedOrder?.final_amount || selectedOrder?.total_amount}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Maximum: ₹{selectedOrder?.final_amount || selectedOrder?.total_amount}
              </p>
            </div>
            <div>
              <Label htmlFor="refund_reason">Refund Reason</Label>
              <Textarea
                id="refund_reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Please provide the reason for refund..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle refund logic here
              console.log("Processing refund:", { refundAmount, refundReason });
              setRefundDialogOpen(false);
            }}>
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}