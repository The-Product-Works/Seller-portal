/**
 * Seller Payout System - Main Export
 * 
 * This module handles seller earnings when orders are delivered.
 * 
 * Usage:
 * ```typescript
 * import { processDeliveryForPayout } from '@/lib/payout';
 * 
 * // When marking order as delivered:
 * const result = await processDeliveryForPayout({
 *   orderItemId: 'uuid',
 *   sellerId: 'uuid'
 * });
 * ```
 */

export { processDeliveryForPayout } from "./delivery-handler";
export { recordSellerEarning } from "./record-earning";
export { initializeSellerBalance } from "./initialize-balance";
