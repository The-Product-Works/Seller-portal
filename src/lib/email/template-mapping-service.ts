/**
 * Email Template Mapping Service
 * Maps alert types to their corresponding email template generators
 */

import type { AlertType, EmailTemplateData } from './types';

// Import all template generators
import { generateAccountApprovedEmail } from './templates/seller/account-approved';
import { generateNewReviewRatingEmail } from './templates/seller/new-review-rating';
import { generatePayoutProcessedEmail } from './templates/seller/payout-processed';
import { generateOrderDeliveredEmail } from './templates/seller/order-delivered';
import { generateNewOrderReceivedEmail } from './templates/seller/new-order-received';
import { generateOrderCancelledSellerEmail } from './templates/seller/order-cancelled';
import { generateReturnInitiatedEmail } from './templates/seller/return-initiated';

import { generateOrderConfirmedEmail } from './templates/buyer/order-confirmed';
import { generateOrderShippedEmail } from './templates/buyer/order-shipped';
import { generateQualityCheckEmail } from './templates/buyer/quality-check';
import { generateOrderPackedEmail } from './templates/buyer/order-packed';
import { generateOrderCancelledBuyerEmail } from './templates/buyer/order-cancelled';

import { generateAdminNewProductEmail } from './templates/admin/new-product-added';
import { generateAdminKYCSubmittedEmail } from './templates/admin/kyc-submitted';

/**
 * Email template mapping configuration
 * Maps each alert type to its corresponding template generator and metadata
 */
const EMAIL_TEMPLATE_MAP: Record<AlertType, {
  generator: (data: EmailTemplateData) => string;
  defaultSubject: string;
  recipientType: 'seller' | 'buyer' | 'admin';
}> = {
  // Seller notifications
  account_approved: {
    generator: generateAccountApprovedEmail,
    defaultSubject: 'Account Approved - Welcome to Seller Portal',
    recipientType: 'seller',
  },
  new_review_rating: {
    generator: generateNewReviewRatingEmail,
    defaultSubject: 'New Review Received for Your Product',
    recipientType: 'seller',
  },
  payout_processed: {
    generator: generatePayoutProcessedEmail,
    defaultSubject: 'Payout Processed Successfully',
    recipientType: 'seller',
  },
  order_delivered: {
    generator: generateOrderDeliveredEmail,
    defaultSubject: 'Order Delivered Successfully',
    recipientType: 'seller',
  },
  new_order_received: {
    generator: generateNewOrderReceivedEmail,
    defaultSubject: 'New Order Received - Action Required',
    recipientType: 'seller',
  },
  order_cancelled_by_seller: {
    generator: generateOrderCancelledSellerEmail,
    defaultSubject: 'Order Cancelled - Update Required',
    recipientType: 'seller',
  },
  order_canceled_by_buyer: {
    generator: generateOrderCancelledSellerEmail,
    defaultSubject: 'Order Cancelled by Customer',
    recipientType: 'seller',
  },
  return_request_received: {
    generator: generateReturnInitiatedEmail,
    defaultSubject: 'Return Request Received - Action Required',
    recipientType: 'seller',
  },
  return_received_by_seller: {
    generator: generateReturnInitiatedEmail, // Reuse for now, can be specialized later
    defaultSubject: 'Return Package Received',
    recipientType: 'seller',
  },
  low_stock_alert: {
    generator: generateNewOrderReceivedEmail, // Placeholder - needs specific template
    defaultSubject: 'Low Stock Alert for Your Product',
    recipientType: 'seller',
  },
  product_out_of_stock: {
    generator: generateNewOrderReceivedEmail, // Placeholder - needs specific template
    defaultSubject: 'Product Out of Stock Alert',
    recipientType: 'seller',
  },
  kyc_verification_required: {
    generator: generateAccountApprovedEmail, // Placeholder - needs specific template
    defaultSubject: 'KYC Verification Required',
    recipientType: 'seller',
  },
  kyc_approved: {
    generator: generateAccountApprovedEmail,
    defaultSubject: 'KYC Verification Approved',
    recipientType: 'seller',
  },
  kyc_rejected: {
    generator: generateAccountApprovedEmail, // Placeholder - needs specific template
    defaultSubject: 'KYC Verification Rejected',
    recipientType: 'seller',
  },
  product_approved: {
    generator: generateAccountApprovedEmail, // Placeholder - needs specific template
    defaultSubject: 'Product Approved for Listing',
    recipientType: 'seller',
  },
  product_rejected: {
    generator: generateAccountApprovedEmail, // Placeholder - needs specific template
    defaultSubject: 'Product Listing Rejected',
    recipientType: 'seller',
  },

  // Buyer notifications
  order_confirmed: {
    generator: generateOrderConfirmedEmail,
    defaultSubject: 'Order Confirmed - Thank You for Your Purchase',
    recipientType: 'buyer',
  },
  payment_successful: {
    generator: generateOrderConfirmedEmail, // Reuse for now
    defaultSubject: 'Payment Successful - Order Processing',
    recipientType: 'buyer',
  },
  payment_failed: {
    generator: generateOrderCancelledBuyerEmail, // Reuse for now
    defaultSubject: 'Payment Failed - Action Required',
    recipientType: 'buyer',
  },
  order_shipped: {
    generator: generateOrderShippedEmail,
    defaultSubject: 'Order Shipped - Track Your Package',
    recipientType: 'buyer',
  },
  order_delivered_to_buyer: {
    generator: generateOrderShippedEmail, // Reuse for now
    defaultSubject: 'Order Delivered Successfully',
    recipientType: 'buyer',
  },
  order_cancelled: {
    generator: generateOrderCancelledBuyerEmail,
    defaultSubject: 'Order Cancelled - Refund Processing',
    recipientType: 'buyer',
  },
  order_quality_check_passed: {
    generator: generateQualityCheckEmail,
    defaultSubject: 'Quality Check Passed - Order Approved',
    recipientType: 'buyer',
  },
  order_quality_check_failed: {
    generator: generateQualityCheckEmail,
    defaultSubject: 'Quality Check Failed - Order Rejected',
    recipientType: 'buyer',
  },
  return_initiated: {
    generator: generateOrderCancelledBuyerEmail, // Placeholder - needs specific template
    defaultSubject: 'Return Request Initiated',
    recipientType: 'buyer',
  },
  return_approved: {
    generator: generateOrderCancelledBuyerEmail, // Placeholder - needs specific template
    defaultSubject: 'Return Request Approved',
    recipientType: 'buyer',
  },
  return_rejected: {
    generator: generateOrderCancelledBuyerEmail, // Placeholder - needs specific template
    defaultSubject: 'Return Request Rejected',
    recipientType: 'buyer',
  },
  refund_initiated: {
    generator: generateOrderCancelledBuyerEmail, // Reuse for now
    defaultSubject: 'Refund Initiated - Processing',
    recipientType: 'buyer',
  },
  refund_completed: {
    generator: generateOrderCancelledBuyerEmail, // Reuse for now
    defaultSubject: 'Refund Completed Successfully',
    recipientType: 'buyer',
  },
  delivery_attempted: {
    generator: generateOrderShippedEmail, // Reuse for now
    defaultSubject: 'Delivery Attempted - Rescheduled',
    recipientType: 'buyer',
  },
  delivery_rescheduled: {
    generator: generateOrderShippedEmail, // Reuse for now
    defaultSubject: 'Delivery Rescheduled - New Date',
    recipientType: 'buyer',
  },

  // Admin notifications
  admin_new_product_added: {
    generator: generateAdminNewProductEmail,
    defaultSubject: 'New Product Added - Review Required',
    recipientType: 'admin',
  },
  admin_bundle_restocked: {
    generator: generateAdminNewProductEmail, // Placeholder
    defaultSubject: 'Bundle Restocked Successfully',
    recipientType: 'admin',
  },
  admin_kyc_submitted: {
    generator: generateAdminKYCSubmittedEmail,
    defaultSubject: 'KYC Verification Submitted - Review Required',
    recipientType: 'admin',
  },
  admin_seller_registration: {
    generator: generateAdminKYCSubmittedEmail, // Placeholder
    defaultSubject: 'New Seller Registration - Action Required',
    recipientType: 'admin',
  },
  admin_dispute_raised: {
    generator: generateAdminKYCSubmittedEmail, // Placeholder
    defaultSubject: 'Dispute Raised - Investigation Required',
    recipientType: 'admin',
  },
  admin_return_request: {
    generator: generateAdminKYCSubmittedEmail, // Placeholder
    defaultSubject: 'Return Request - Admin Review',
    recipientType: 'admin',
  },
  admin_payment_issue: {
    generator: generateAdminKYCSubmittedEmail, // Placeholder
    defaultSubject: 'Payment Issue - Admin Attention',
    recipientType: 'admin',
  },
  admin_quality_check_required: {
    generator: generateAdminKYCSubmittedEmail, // Placeholder
    defaultSubject: 'Quality Check Required - Admin Review',
    recipientType: 'admin',
  },
};

/**
 * Generate email content for a specific alert type
 */
export function generateEmailContent(
  alertType: AlertType,
  templateData: EmailTemplateData
): {
  htmlContent: string;
  subject: string;
  recipientType: 'seller' | 'buyer' | 'admin';
} {
  const templateConfig = EMAIL_TEMPLATE_MAP[alertType];
  
  if (!templateConfig) {
    throw new Error(`No template found for alert type: ${alertType}`);
  }

  const htmlContent = templateConfig.generator(templateData);
  
  return {
    htmlContent,
    subject: templateConfig.defaultSubject,
    recipientType: templateConfig.recipientType,
  };
}

/**
 * Check if an alert type has a template
 */
export function hasTemplate(alertType: AlertType): boolean {
  return alertType in EMAIL_TEMPLATE_MAP;
}

/**
 * Get all supported alert types
 */
export function getSupportedAlertTypes(): AlertType[] {
  return Object.keys(EMAIL_TEMPLATE_MAP) as AlertType[];
}

/**
 * Get template metadata for an alert type
 */
export function getTemplateMetadata(alertType: AlertType) {
  const templateConfig = EMAIL_TEMPLATE_MAP[alertType];
  
  if (!templateConfig) {
    return null;
  }

  return {
    defaultSubject: templateConfig.defaultSubject,
    recipientType: templateConfig.recipientType,
  };
}