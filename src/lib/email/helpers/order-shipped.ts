/**
 * Order Shipped Email Helper
 * Generates and sends order shipped notification to buyer
 */

import { generateOrderShippedEmail } from '@/lib/email/templates/buyer/order-shipped';
import { sendEmail } from '@/services/email-service';

export interface OrderShippedParams {
  customerName: string;
  customerEmail: string;
  orderNumber: string; // Display version (e.g., "A3B2C1D4")
  orderId: string; // Actual UUID for database
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

export async function sendOrderShippedEmail(params: OrderShippedParams): Promise<void> {
  console.log('📨 [Helper] sendOrderShippedEmail called with params:', {
    customerEmail: params.customerEmail,
    orderNumber: params.orderNumber,
    trackingNumber: params.trackingNumber,
  });

  const { subject, html } = generateOrderShippedEmail(params);
  
  console.log('📝 [Helper] Email template generated:', {
    subject,
    htmlLength: html.length,
  });

  await sendEmail({
    alertType: 'order_shipped',
    recipientEmail: params.customerEmail,
    recipientType: 'buyer',
    recipientId: undefined, // Buyer ID if available
    subject,
    htmlContent: html,
    relatedOrderId: params.orderId, // Use actual UUID for database
    metadata: {
      orderNumber: params.orderNumber, // Display version in metadata
      trackingNumber: params.trackingNumber,
      carrier: params.carrier,
      estimatedDelivery: params.estimatedDelivery,
    },
  });
}
