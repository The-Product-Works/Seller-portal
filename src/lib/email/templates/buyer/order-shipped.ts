/**
 * Order Shipped Email Template for Buyers
 * Sent when order is shipped with tracking information
 */

import {
  buildEmailWrapper,
  buildActionButton,
  buildOrderItemsTable,
  buildStatusBadge,
  formatDate,
} from "../template-utils";
import type { OrderShippedTemplateData } from "../types";

export function generateOrderShippedEmail(
  data: OrderShippedTemplateData
): string {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #3b82f6; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">🚚</span>
      </div>
      <h2 style="color: #3b82f6; margin: 0; font-size: 28px;">Your Order is on the Way!</h2>
    </div>

    <div style="background: #eff6ff; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #3b82f6;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hello <strong>${data.customerName}</strong>,
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Great news! Your order has been shipped and is on its way to you. Use the tracking information below to monitor your package's progress.
      </p>
    </div>

    <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #e5e7eb;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 18px; color: #374151;">Shipping Information</h3>
        ${buildStatusBadge("Shipped", "info")}
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Order Number:</span>
        <span style="color: #374151; font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">#${
          data.orderNumber
        }</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Carrier:</span>
        <span style="color: #374151;">${data.carrier}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Tracking Number:</span>
        <span style="color: #374151; font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${
          data.trackingNumber
        }</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
        <span style="font-weight: 500; color: #6b7280;">Estimated Delivery:</span>
        <span style="color: #10b981; font-weight: 600;">${formatDate(
          data.estimatedDelivery
        )}</span>
      </div>

      ${buildActionButton({
        text: "Track Package",
        url: data.trackingUrl,
        color: "#3b82f6",
      })}
    </div>

    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Shipped Items</h3>
      ${buildOrderItemsTable(data.items)}
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">📦 Shipping Details</h3>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Seller:</span>
        <span style="color: #374151;">${data.sellerName}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
        <span style="font-weight: 500; color: #6b7280;">Shipping Method:</span>
        <span style="color: #374151;">Standard Delivery</span>
      </div>
    </div>

    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #065f46;">📍 Delivery Information</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #10b981; margin-right: 8px;">•</span>
        <span style="color: #374151;">Someone should be available to receive the package</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #10b981; margin-right: 8px;">•</span>
        <span style="color: #374151;">Valid ID may be required for high-value items</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #10b981; margin-right: 8px;">•</span>
        <span style="color: #374151;">If you're not available, the package may be left with a neighbor or redelivered</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #10b981; margin-right: 8px;">•</span>
        <span style="color: #374151;">Check tracking regularly for real-time updates</span>
      </div>
    </div>

    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #92400e;">⚠️ Important Notes</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Delivery times may vary due to weather or other factors</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Contact the carrier directly for detailed delivery updates</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Ensure your address details are correct in the tracking system</span>
      </div>
    </div>

    ${buildActionButton({
      text: "View Order Details",
      url: data.orderUrl,
      color: "#6b7280",
      style: "secondary",
    })}

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Questions about your shipment?
      </p>
      <a href="https://support.sellerportal.com/shipping" 
         style="color: #3b82f6; text-decoration: none; font-weight: 500;">
        Contact Shipping Support
      </a>
    </div>

    <div style="text-align: center; margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 8px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #374151;">📱 Track on the Go</h3>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        Download our mobile app to get real-time notifications about your delivery.
      </p>
    </div>

    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        📧 You'll receive another email confirmation once your order is delivered.
      </p>
    </div>
  `;

  return buildEmailWrapper({
    title: "Your Order Has Shipped",
    recipientName: data.customerName,
    recipientEmail: data.customerName, // Note: email should be passed in data
    content,
    headerColor: "#3b82f6",
  });
}
