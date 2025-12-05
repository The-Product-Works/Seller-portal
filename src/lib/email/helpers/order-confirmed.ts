/**
 * Order Confirmed Email Helper
 * Helper function for sending order confirmation emails to buyers
 */

import { notificationService } from '../enhanced-notification-service';
import { generateBuyerOrderUrl, generateSupportUrl, calculateEstimatedDelivery } from '../utils';
import type { OrderConfirmedTemplateData, SendEmailResult } from '../types';

export interface SendOrderConfirmedEmailParams {
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  currency: string;
  sellerName: string;
  sellerId: string;
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
  estimatedDeliveryDays?: number;
}

export async function sendOrderConfirmedEmail(
  params: SendOrderConfirmedEmailParams
): Promise<SendEmailResult> {
  const {
    orderId,
    customerId,
    customerName,
    customerEmail,
    orderNumber,
    orderDate,
    totalAmount,
    currency,
    sellerName,
    sellerId,
    items,
    shippingAddress,
    estimatedDeliveryDays = 7,
  } = params;

  const templateData: OrderConfirmedTemplateData = {
    customerName,
    customerEmail,
    orderNumber,
    orderDate,
    totalAmount,
    currency,
    sellerName,
    items,
    shippingAddress,
    estimatedDelivery: calculateEstimatedDelivery(orderDate, estimatedDeliveryDays),
    orderUrl: generateBuyerOrderUrl(orderId),
    supportUrl: generateSupportUrl({
      subject: `Order ${orderNumber} - Support Request`,
      orderNumber,
      userId: customerId,
    }),
  };

  return notificationService.sendNotification({
    type: 'order_confirmed',
    recipientEmail: customerEmail,
    templateData,
    relatedOrderId: orderId,
    relatedSellerId: sellerId,
    metadata: {
      orderNumber,
      sellerName,
      totalAmount,
      currency,
      itemCount: items.length,
    },
  });
}