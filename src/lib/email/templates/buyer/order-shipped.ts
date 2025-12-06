/**
 * Order Shipped Email Template
 * Sent to buyer when seller marks order as shipped
 */

import { OrderShippedTemplateData } from '@/lib/email/types';
import { buildEmailWrapper, buildActionButton } from '@/lib/email/template-utils';

export function generateOrderShippedEmail(data: OrderShippedTemplateData): {
  subject: string;
  html: string;
} {
  const subject = `Order Shipped - #${data.orderNumber} 📦`;

  // Build order items HTML
  const itemsHtml = data.items
    .map(
      item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="60" valign="top">
              ${
                item.imageUrl
                  ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover; border: 1px solid #e5e7eb;" />`
                  : `<div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">${item.name.charAt(0)}</div>`
              }
            </td>
            <td style="padding-left: 12px;">
              <div style="font-weight: 600; color: #111827;">${item.name}</div>
              <div style="color: #6B7280; font-size: 14px;">Qty: ${item.quantity}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
    )
    .join('');

  const cardContent = `
    <!-- Shipping Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%;">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M25 32.5H17.5C16.1193 32.5 15 33.6193 15 35V55C15 56.3807 16.1193 57.5 17.5 57.5H25M25 32.5V57.5M25 32.5H45M25 57.5H32.5M45 32.5H57.5L65 40V55C65 56.3807 63.8807 57.5 62.5 57.5H57.5M45 32.5V57.5M45 57.5H32.5M45 57.5H57.5M32.5 57.5C32.5 60.2614 30.2614 62.5 27.5 62.5C24.7386 62.5 22.5 60.2614 22.5 57.5M32.5 57.5C32.5 54.7386 30.2614 52.5 27.5 52.5C24.7386 52.5 22.5 54.7386 22.5 57.5M57.5 57.5C57.5 60.2614 55.2614 62.5 52.5 62.5C49.7386 62.5 47.5 60.2614 47.5 57.5M57.5 57.5C57.5 54.7386 55.2614 52.5 52.5 52.5C49.7386 52.5 47.5 54.7386 47.5 57.5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- Main Message -->
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827; text-align: center;">
      Your Order is On the Way!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #6B7280; text-align: center; line-height: 1.6;">
      Good news, <strong>${data.customerName}</strong>! Your order has been shipped and is on its way to you.
    </p>

    <!-- Shipping Details -->
    <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Order Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">#${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Carrier</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${data.carrier}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Tracking Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #667eea;">${data.trackingNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Estimated Delivery</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #10B981;">${data.estimatedDelivery}</td>
        </tr>
      </table>
    </div>

    <!-- Track Shipment Button -->
    ${buildActionButton(data.trackingUrl, '📦 Track Your Shipment')}

    <!-- Order Items -->
    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">Items in this shipment</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        ${itemsHtml}
      </table>
    </div>

    <!-- View Order Button -->
    ${buildActionButton(data.orderUrl, 'View Order Details')}

    <!-- Help Text -->
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6B7280; text-align: center;">
      Questions about your order? <a href="mailto:support@trupromart.com" style="color: #667eea; text-decoration: none;">Contact Support</a>
    </p>
  `;

  const html = buildEmailWrapper({
    title: subject,
    recipientName: data.customerName,
    recipientEmail: data.customerEmail,
    content: cardContent,
  });

  return { subject, html };
}
