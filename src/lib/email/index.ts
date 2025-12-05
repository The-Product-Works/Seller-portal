/**
 * Email System Index
 * Main entry point for the seller portal email notification system
 */

// Core services
export { NotificationService, notificationService, sendNotificationWithTemplate } from './enhanced-notification-service';
export { generateEmailContent, hasTemplate, getSupportedAlertTypes, getTemplateMetadata } from './template-mapping-service';

// Import for internal use
import { notificationService } from './enhanced-notification-service';

// Testing and diagnostics
export { testEmailSystemConnection, quickHealthCheck, testAllTemplateTypes } from './connection-test';

// Types
export type {
  AlertType,
  RecipientType,
  EmailStatus,
  SendEmailParams,
  SendEmailResult,
  EmailNotificationParams,
  EmailNotificationRecord,
  EmailTemplateData,
  // Seller templates
  AccountApprovedTemplateData,
  NewReviewRatingTemplateData,
  PayoutProcessedTemplateData,
  OrderDeliveredTemplateData,
  OrderCancelledBySellerTemplateData,
  ReturnReceivedTemplateData,
  // Buyer templates
  OrderConfirmedTemplateData,
  OrderShippedTemplateData,
  QualityCheckTemplateData,
  // Admin templates
  AdminNewProductTemplateData,
  AdminBundleRestockedTemplateData,
  AdminKYCSubmittedTemplateData,
  LowStockAlertTemplateData,
  NewOrderSellerTemplateData,
  // New template types
  OrderCancelledBuyerTemplateData,
  OrderCancelledSellerTemplateData,
  OrderUpdateBuyerTemplateData,
  ReturnInitiatedSellerTemplateData,
} from './types';

// Template utilities
export {
  buildEmailWrapper,
  buildRecipientInfoSection,
  buildActionButton,
  buildStatusBadge,
  buildOrderItemsTable,
  buildShippingAddressSection,
  buildOrderSummarySection,
  formatCurrency,
  formatDate,
  formatDateTime,
} from './template-utils';

// Utilities
export {
  getFirstName,
  formatOrderNumber,
  generateTrackingUrl,
  generateSellerDashboardUrl,
  generateBuyerOrderUrl,
  generateAdminDashboardUrl,
  generateSupportUrl,
  sanitizeEmail,
  generateReviewUrl,
  calculateEstimatedDelivery,
  getTimeBasedGreeting,
  truncateText,
  getRatingStars,
  formatPrice,
  getOrderStatusColor,
  formatPhoneNumber,
  generateTrackingId,
  isValidUrl,
} from './utils';

// Email templates
export { generateAccountApprovedEmail } from './templates/seller/account-approved';
export { generateNewReviewRatingEmail } from './templates/seller/new-review-rating';
export { generatePayoutProcessedEmail } from './templates/seller/payout-processed';
export { generateOrderDeliveredEmail } from './templates/seller/order-delivered';
export { generateNewOrderReceivedEmail } from './templates/seller/new-order-received';
export { generateOrderCancelledSellerEmail } from './templates/seller/order-cancelled';
export { generateReturnInitiatedEmail } from './templates/seller/return-initiated';

export { generateOrderConfirmedEmail } from './templates/buyer/order-confirmed';
export { generateOrderShippedEmail } from './templates/buyer/order-shipped';
export { generateQualityCheckEmail } from './templates/buyer/quality-check';
export { generateOrderPackedEmail } from './templates/buyer/order-packed';
export { generateOrderCancelledBuyerEmail } from './templates/buyer/order-cancelled';

export { generateAdminNewProductEmail } from './templates/admin/new-product-added';
export { generateAdminKYCSubmittedEmail } from './templates/admin/kyc-submitted';

// Helper functions
export { sendAccountApprovedEmail } from './helpers/account-approved';
export { sendOrderConfirmedEmail } from './helpers/order-confirmed';
export { sendQualityCheckEmail } from './helpers/quality-check';
export { sendAdminKYCSubmittedEmail, sendAdminKYCSubmittedEmailToMultiple } from './helpers/admin-kyc-submitted';
export { sendNewOrderReceivedEmail } from './helpers/new-order-received';
export { sendOrderPackedEmail } from './helpers/order-packed';
export { sendOrderCancelledBuyerEmail } from './helpers/order-cancelled-buyer';
export { sendOrderCancelledSellerEmail } from './helpers/order-cancelled-seller';
export { sendReturnInitiatedEmail } from './helpers/return-initiated';

// Helper function types
export type { SendAccountApprovedEmailParams } from './helpers/account-approved';
export type { SendOrderConfirmedEmailParams } from './helpers/order-confirmed';
export type { SendQualityCheckEmailParams } from './helpers/quality-check';
export type { SendAdminKYCSubmittedEmailParams } from './helpers/admin-kyc-submitted';

// Email helper functions by category

/**
 * Seller Notification Helpers
 * Functions for sending emails to sellers
 */
export const SellerEmails = {
  sendAccountApproved: async (params: SendAccountApprovedEmailParams) => {
    const { sendAccountApprovedEmail } = await import('./helpers/account-approved');
    return sendAccountApprovedEmail(params);
  },
  
  // Add more seller email helpers as needed
  sendNewReviewRating: async (params: NewReviewRatingTemplateData) => {
    // Implementation would be added
    throw new Error('Not implemented yet');
  },
  
  sendPayoutProcessed: async (params: PayoutProcessedTemplateData) => {
    // Implementation would be added
    throw new Error('Not implemented yet');
  },
  
  sendOrderDelivered: async (params: OrderDeliveredTemplateData) => {
    // Implementation would be added
    throw new Error('Not implemented yet');
  },
};

/**
 * Buyer Notification Helpers
 * Functions for sending emails to buyers
 */
export const BuyerEmails = {
  sendOrderConfirmed: async (params: SendOrderConfirmedEmailParams) => {
    const { sendOrderConfirmedEmail } = await import('./helpers/order-confirmed');
    return sendOrderConfirmedEmail(params);
  },
  
  sendQualityCheck: async (params: SendQualityCheckEmailParams) => {
    const { sendQualityCheckEmail } = await import('./helpers/quality-check');
    return sendQualityCheckEmail(params);
  },
  
  // Add more buyer email helpers as needed
  sendOrderShipped: async (params: OrderShippedTemplateData) => {
    // Implementation would be added
    throw new Error('Not implemented yet');
  },
  
  sendOrderDelivered: async (params: OrderDeliveredTemplateData) => {
    // Implementation would be added
    throw new Error('Not implemented yet');
  },
};

/**
 * Admin Notification Helpers
 * Functions for sending emails to admins
 */
export const AdminEmails = {
  sendKYCSubmitted: async (params: SendAdminKYCSubmittedEmailParams) => {
    const { sendAdminKYCSubmittedEmail } = await import('./helpers/admin-kyc-submitted');
    return sendAdminKYCSubmittedEmail(params);
  },
  
  sendKYCSubmittedToMultiple: async (params: SendAdminKYCSubmittedEmailParams & { adminEmails: string[] }) => {
    const { sendAdminKYCSubmittedEmailToMultiple } = await import('./helpers/admin-kyc-submitted');
    return sendAdminKYCSubmittedEmailToMultiple(params);
  },
  
  // Add more admin email helpers as needed
  sendNewProductAdded: async (params: AdminNewProductTemplateData) => {
    // Implementation would be added
    throw new Error('Not implemented yet');
  },
  
  sendBundleRestocked: async (params: AdminBundleRestockedTemplateData) => {
    // Implementation would be added
    throw new Error('Not implemented yet');
  },
};

/**
 * Quick access to common email functions
 */
export const EmailQuickActions = {
  // Test email functionality
  test: async (email: string, message?: string) => {
    return notificationService.sendTestEmail(email);
  },
  
  // Send order confirmation to buyer
  orderConfirmed: BuyerEmails.sendOrderConfirmed,
  
  // Send account approval to seller
  accountApproved: SellerEmails.sendAccountApproved,
  
  // Send KYC notification to admin
  kycSubmitted: AdminEmails.sendKYCSubmitted,
  
  // Send quality check result to buyer
  qualityCheck: BuyerEmails.sendQualityCheck,
};

/**
 * Email system configuration and health check
 */
export const EmailSystem = {
  // Test the email system
  healthCheck: async (testEmail: string) => {
    try {
      const result = await EmailQuickActions.test(testEmail, 'Email system health check');
      return {
        healthy: result.success,
        message: result.success ? 'Email system is working correctly' : result.error,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  },
  
  // Validate email configuration
  validateConfig: () => {
    // Add configuration validation logic
    return {
      valid: true,
      issues: [],
    };
  },
};