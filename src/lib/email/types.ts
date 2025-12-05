/**
 * Email Types and Interfaces for Seller Portal
 * Defines all types for email notifications system
 */

// Alert types based on seller portal requirements
export type AlertType =
  // Seller notifications
  | 'account_approved'
  | 'new_review_rating'
  | 'payout_processed'
  | 'order_delivered'
  | 'order_cancelled_by_seller'
  | 'return_received_by_seller'
  | 'new_order_received'
  | 'order_canceled_by_buyer'
  | 'return_request_received'
  | 'low_stock_alert'
  | 'product_out_of_stock'
  | 'kyc_verification_required'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'product_approved'
  | 'product_rejected'
  // Buyer notifications for order status changes
  | 'order_confirmed'
  | 'payment_successful'
  | 'payment_failed'
  | 'order_shipped'
  | 'order_delivered_to_buyer'
  | 'order_cancelled'
  | 'order_quality_check_passed'
  | 'order_quality_check_failed'
  | 'return_initiated'
  | 'return_approved'
  | 'return_rejected'
  | 'refund_initiated'
  | 'refund_completed'
  | 'delivery_attempted'
  | 'delivery_rescheduled'
  // Admin notifications
  | 'admin_new_product_added'
  | 'admin_bundle_restocked'
  | 'admin_kyc_submitted'
  | 'admin_seller_registration'
  | 'admin_dispute_raised'
  | 'admin_return_request'
  | 'admin_payment_issue'
  | 'admin_quality_check_required';

export type RecipientType = 'buyer' | 'seller' | 'admin';

export type EmailStatus = 'sent' | 'failed' | 'pending';

// Base email sending parameters for Supabase Edge Function
export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

// Email sending result
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  notificationId?: string;
  error?: string;
}

// Email notification parameters for the Supabase function
export interface EmailNotificationParams {
  alertType: AlertType;
  recipientId?: string;
  recipientEmail: string;
  recipientType: RecipientType;
  subject: string;
  htmlContent: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  relatedSellerId?: string;
  relatedEntityId?: string;
  trackingId?: string;
  transactionId?: string;
  metadata?: Record<string, unknown>;
}

// Email notification database record
export interface EmailNotificationRecord {
  notification_id: string;
  notification_type: string;
  recipient_type: RecipientType;
  recipient_id?: string;
  recipient_email: string;
  subject: string;
  alert_type: AlertType;
  related_order_id?: string;
  related_product_id?: string;
  related_seller_id?: string;
  related_entity_id?: string;
  tracking_id?: string;
  transaction_id?: string;
  sent_at: string;
  status: EmailStatus;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Template data interfaces for different email types

// Seller notification templates
export interface AccountApprovedTemplateData {
  sellerName: string;
  sellerEmail: string;
  approvalDate: string;
  dashboardUrl: string;
  supportUrl?: string;
}

export interface NewReviewRatingTemplateData {
  sellerName: string;
  customerName: string;
  rating: number;
  review: string;
  productName: string;
  orderNumber: string;
  reviewDate: string;
  dashboardUrl: string;
}

export interface PayoutProcessedTemplateData {
  sellerName: string;
  amount: number;
  currency: string;
  payoutDate: string;
  transactionId: string;
  paymentMethod: string;
  payoutPeriod: string;
  dashboardUrl: string;
}

export interface OrderDeliveredTemplateData {
  sellerName: string;
  customerName: string;
  orderNumber: string;
  deliveryDate: string;
  totalAmount: number;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  dashboardUrl: string;
}

export interface OrderCancelledBySellerTemplateData {
  sellerName: string;
  customerName: string;
  orderNumber: string;
  cancellationDate: string;
  cancellationReason: string;
  refundAmount: number;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  dashboardUrl: string;
}

export interface ReturnReceivedTemplateData {
  sellerName: string;
  customerName: string;
  orderNumber: string;
  returnDate: string;
  returnReason: string;
  items: Array<{
    name: string;
    quantity: number;
    condition: string;
  }>;
  actionRequired: string;
  dashboardUrl: string;
}

// Buyer notification templates
export interface OrderConfirmedTemplateData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  currency: string;
  sellerName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }>;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  estimatedDelivery?: string;
  orderUrl: string;
  supportUrl?: string;
}

export interface OrderShippedTemplateData {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  trackingUrl: string;
  carrier: string;
  estimatedDelivery: string;
  sellerName: string;
  items: Array<{
    name: string;
    quantity: number;
    imageUrl?: string;
  }>;
  orderUrl: string;
}

export interface QualityCheckTemplateData {
  customerName: string;
  orderNumber: string;
  checkDate: string;
  status: 'passed' | 'failed';
  items: Array<{
    name: string;
    quantity: number;
    status: 'passed' | 'failed';
    notes?: string;
  }>;
  nextSteps: string;
  orderUrl: string;
}

// Admin notification templates
export interface AdminNewProductTemplateData {
  adminName: string;
  sellerName: string;
  productName: string;
  productCategory: string;
  submissionDate: string;
  productUrl: string;
  approvalUrl: string;
}

export interface AdminBundleRestockedTemplateData {
  adminName: string;
  sellerName: string;
  bundleName: string;
  restockQuantity: number;
  restockDate: string;
  dashboardUrl: string;
}

export interface AdminKYCSubmittedTemplateData {
  adminName: string;
  sellerName: string;
  sellerEmail: string;
  submissionDate: string;
  documentsSubmitted: string[];
  reviewUrl: string;
}

export interface LowStockAlertTemplateData {
  sellerName: string;
  sellerEmail: string;
  productName: string;
  currentStock: number;
  threshold: number;
  productUrl: string;
  inventoryUrl: string;
}

export interface NewOrderSellerTemplateData {
  sellerName: string;
  sellerEmail: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  orderUrl: string;
  sellerDashboardUrl: string;
}

// Additional template data types for new notifications

export interface OrderCancelledBuyerTemplateData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  sellerName: string;
  cancellationDate: string;
  cancelledBy: 'seller' | 'customer' | 'system';
  reason?: string;
  refundAmount: number;
  refundMethod: string;
  refundProcessingTime: string;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }>;
  shopUrl: string;
  ordersUrl: string;
}

export interface OrderCancelledSellerTemplateData {
  sellerName: string;
  sellerEmail: string;
  customerName: string;
  orderNumber: string;
  orderDate: string;
  cancellationDate: string;
  cancelledBy: 'seller' | 'customer' | 'system';
  reason?: string;
  orderAmount: number;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  orderUrl: string;
  dashboardUrl: string;
  inventoryUrl: string;
  impactOnSeller?: {
    rateImpact: 'positive' | 'neutral' | 'negative';
    currentRate: number;
    performanceStatus: 'excellent' | 'good' | 'needs_improvement';
    suggestions?: string[];
  };
}

export interface OrderUpdateBuyerTemplateData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  sellerName: string;
  updateDate: string;
  totalAmount: number;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }>;
  shippingAddress: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  trackingUrl: string;
  orderUrl: string;
  expectedDeliveryDate?: string;
}

export interface ReturnInitiatedSellerTemplateData {
  sellerName: string;
  sellerEmail: string;
  returnId: string;
  orderNumber: string;
  customerName: string;
  returnReason: string;
  returnType: 'defective' | 'wrong_item' | 'not_as_described' | 'change_of_mind' | 'other';
  returnDate: string;
  refundAmount: number;
  currency: string;
  returnItems: Array<{
    name: string;
    quantity: number;
    price: number;
    reason: string;
  }>;
  customerComments?: string;
  returnImages?: string[];
  returnUrl: string;
  approveUrl: string;
  declineUrl: string;
  returnPolicyDays?: number;
}

export type EmailTemplateData = 
  | AccountApprovedTemplateData
  | NewReviewRatingTemplateData
  | PayoutProcessedTemplateData
  | OrderDeliveredTemplateData
  | OrderCancelledBySellerTemplateData
  | ReturnReceivedTemplateData
  | OrderConfirmedTemplateData
  | OrderShippedTemplateData
  | QualityCheckTemplateData
  | AdminNewProductTemplateData
  | AdminBundleRestockedTemplateData
  | AdminKYCSubmittedTemplateData
  | LowStockAlertTemplateData
  | NewOrderSellerTemplateData
  | OrderCancelledBuyerTemplateData
  | OrderCancelledSellerTemplateData
  | OrderUpdateBuyerTemplateData
  | ReturnInitiatedSellerTemplateData;