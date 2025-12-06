/**
 * Email Types and Interfaces
 * Defines all types for email notifications system
 */

// Alert types based on database schema
export type AlertType =
  // Buyer notifications
  | 'order_confirmed'
  | 'payment_successful'
  | 'payment_failed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'return_requested'
  | 'refund_initiated'
  | 'refund_completed'
  | 'welcome'
  | 'profile_updated'
  // Seller notifications
  | 'new_order_received'
  | 'order_canceled_by_buyer'
  | 'return_request_received'
  | 'seller_refund_completed'
  | 'low_stock_alert'
  | 'product_out_of_stock'
  | 'account_approved'
  | 'new_review_rating'
  | 'payout_processed'
  // Admin notifications
  | 'admin_payment_failed'
  | 'admin_order_cancellation'
  | 'admin_return_request'
  | 'admin_return_received'
  | 'admin_dispute_raised'
  | 'admin_new_seller_registration'
  | 'admin_seller_kyc_submitted'
  | 'admin_report_received';

export type RecipientType = 'buyer' | 'seller' | 'admin';

export type EmailStatus = 'sent' | 'failed' | 'pending';

// Template data interfaces for email types

export interface OrderShippedTemplateData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  trackingNumber: string;
  trackingUrl: string;
  carrier: string;
  estimatedDelivery: string;
  items: Array<{
    name: string;
    quantity: number;
    imageUrl?: string;
  }>;
  orderUrl: string;
}

export interface OrderDeliveredTemplateData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  deliveryDate: string;
  items: Array<{
    name: string;
    quantity: number;
    imageUrl?: string;
  }>;
  orderUrl: string;
}

export interface OrderCancelledTemplateData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  cancellationReason: string;
  cancelledBy: 'seller' | 'buyer' | 'admin';
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  refundAmount?: number;
  refundMethod?: string;
  orderUrl: string;
}

export interface RefundInitiatedTemplateData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  refundAmount: number;
  refundMethod: string;
  estimatedRefundDate: string;
  reason: string;
  orderUrl: string;
}

export interface RefundCompletedTemplateData {
  recipientName: string;
  recipientEmail: string;
  recipientType: RecipientType;
  orderNumber: string;
  refundAmount: number;
  refundMethod: string;
  refundDate: string;
  transactionId: string;
  orderUrl: string;
}

export interface NewSellerRegistrationTemplateData {
  adminName: string;
  adminEmail: string;
  sellerName: string;
  sellerEmail: string;
  sellerId: string;
  businessName?: string;
  registrationDate: string;
  sellerDashboardUrl: string;
}

export interface WelcomeSellerTemplateData {
  sellerName: string;
  sellerEmail: string;
  businessName?: string;
  dashboardUrl: string;
  kycUrl: string;
  supportEmail: string;
}

export interface AdminReturnReceivedTemplateData {
  adminName: string;
  adminEmail: string;
  orderNumber: string;
  buyerName: string;
  sellerName: string;
  returnId: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  qcStatus: string;
  returnDashboardUrl: string;
}
