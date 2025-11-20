/**
 * Main notification service
 * Exports all notification functions for easy import
 */

export { sendEmail } from './email-service';
export type { AlertType } from './email-service';
export {
  getNewOrderEmailTemplate,
  getReturnRequestEmailTemplate,
  getLowStockAlertTemplate,
  getOutOfStockAlertTemplate,
  getPayoutProcessedTemplate
} from './email-templates';
export { notifyPayoutProcessed } from './payout-notification';
