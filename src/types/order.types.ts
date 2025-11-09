import { Database } from "@/integrations/supabase/database.types";

// Base database types
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderReturnRow = Database["public"]["Tables"]["order_returns"]["Row"];
export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type AddressRow = Database["public"]["Tables"]["addresses"]["Row"];

// Order status types
export type OrderStatus = "confirmed" | "packed" | "shipped" | "in_transit" | "delivered" | "cancelled";

// Return status types
export type ReturnStatus = 
  | "NA" 
  | "return_requested" 
  | "return_approved" 
  | "return_rejected" 
  | "in_return_transit" 
  | "under_qc" 
  | "refund_initiated" 
  | "qc_failed" 
  | "return_closed";

// Date filter types
export type DateFilter = "today" | "last_7_days" | "last_30_days" | "this_month" | "last_month" | "custom";

// Enhanced order with relations and return status
export interface OrderWithDetails extends OrderRow {
  // Customer information
  users?: {
    email: string;
    phone: string | null;
    user_profiles?: Array<{
      full_name: string | null;
    }>;
  } | null;
  
  // Bundle information (if this order is for a bundle)
  bundles?: {
    id: string;
    name: string;
    description: string | null;
    total_price: number;
    discount_percentage: number | null;
    image_url: string | null;
    product_ids: string[];
  } | null;
  
  // Shipping address
  addresses: {
    name: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    phone: string;
  } | null;
  
  // Order items with product details
  order_items: Array<{
    order_item_id: string;
    listing_id: string;
    variant_id: string | null;
    quantity: number;
    price_per_unit: number;
    subtotal: number | null;
    status: string | null;
    seller_product_listings: {
      seller_title: string;
    } | null;
    listing_variants: {
      variant_name: string | null;
      sku: string | null;
      batch_number: string | null;
    } | null;
  }>;
  
  // Return information
  order_returns: Array<{
    return_id: string;
    reason: string;
    status: string;
    initiated_at: string | null;
    notes: string | null;
    return_type: string | null;
  }>;
  
  // Payment information
  payments: Array<{
    payment_id: string;
    method: string | null;
    status: string | null;
    paid_at: string | null;
  }>;

  // Order tracking information
  order_tracking: Array<{
    tracking_id: string;
    url: string;
    status: string;
    location: string | null;
    notes: string | null;
    updated_at: string | null;
  }>;

  // Computed return status
  return_status: ReturnStatus;
}

// Order summary for listing
export interface OrderSummary {
  order_id: string;
  date: string;
  product_variant: string;
  quantity: number;
  batch: string;
  value: number;
  status: OrderStatus;
  return_status: ReturnStatus;
  customer_name: string | null;
  customer_email: string | null;
}

// Raw order data from database with joins
export interface RawOrderDataFromDB {
  order_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  total_amount: number;
  shipping_cost: number | null;
  discount_amount: number | null;
  final_amount: number | null;
  payment_status: string | null;
  created_at: string;
  updated_at: string | null;
  order_items?: Array<{
    quantity: number;
    price: number;
    seller_product_listings?: {
      seller_title: string;
      listing_id: string;
    };
    listing_variants?: {
      variant_name: string;
      sku: string;
    };
  }>;
  users?: {
    email: string;
    full_name?: string;
  };
  addresses?: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  order_returns?: Array<{
    status: string;
    created_at: string;
  }>;
}

// Order search and filter params
export interface OrderFilters {
  search: string;
  status: OrderStatus | "all";
  returnStatus: ReturnStatus | "all";
  dateFilter: DateFilter;
  startDate?: string;
  endDate?: string;
}

// Consignment tracking details
export interface ConsignmentDetails {
  consignmentNumber: string;
  trackingLink: string;
  courierPartner: string;
  estimatedDelivery?: string;
}

// Order actions
export interface OrderActions {
  canMarkPacked: boolean;
  canCancel: boolean;
  canInitiateRefund: boolean;
  canMarkQCPassed: boolean;
  canUpdateTracking: boolean;
}

// Return QC result
export interface ReturnQCResult {
  passed: boolean;
  notes: string;
  refundAmount?: number;
}

// Order summary calculations
export interface OrderFinancials {
  itemTotal: number;
  shipping: number;
  discount: number;
  tax: number;
  marketplaceFee: number;
  sellerEarnings: number;
  finalAmount: number;
}