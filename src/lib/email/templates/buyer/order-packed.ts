/**
 * Order Packed Email Template for Buyers
 * Sent when seller has packed the order and it's ready for pickup
 */

import {
  buildEmailWrapper,
  buildActionButton,
  buildOrderItemsTable,
  buildProgressSteps,
  formatCurrency,
  formatDate,
} from "../template-utils";
import type { OrderUpdateBuyerTemplateData } from "../types";

export function generateOrderPackedEmail(
  data: OrderUpdateBuyerTemplateData
): string {
  const progressSteps = [
    { label: "Order Confirmed", completed: true },
    { label: "Items Packed", completed: true, current: true },
    { label: "Shipped", completed: false },
    { label: "Out for Delivery", completed: false },
    { label: "Delivered", completed: false },
  ];

  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #10b981; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">📦</span>
      </div>
      <h2 style="color: #10b981; margin: 0; font-size: 28px;">Order Packed & Ready!</h2>
    </div>

    <div style="background: #f0fdf4; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hello <strong>${data.customerName}</strong>,
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Great news! Your order has been carefully packed by <strong>${
          data.sellerName
        }</strong> and is ready for shipment. It will be picked up by our logistics partner soon.
      </p>
    </div>

    <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #e5e7eb;">
      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #374151;">Order Summary</h3>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Order Number:</span>
        <span style="color: #374151; font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">#${
          data.orderNumber
        }</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Seller:</span>
        <span style="color: #374151;">${data.sellerName}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Packed Date:</span>
        <span style="color: #374151;">${formatDate(data.updateDate)}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
        <span style="font-weight: 500; color: #6b7280;">Total Amount:</span>
        <span style="color: #10b981; font-weight: 600; font-size: 18px;">${formatCurrency(
          data.totalAmount,
          data.currency
        )}</span>
      </div>
    </div>

    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Order Progress</h3>
      ${buildProgressSteps(progressSteps)}
    </div>

    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Packed Items</h3>
      ${buildOrderItemsTable(data.items)}
    </div>

    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #1e40af;">📋 What Happens Next?</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">1.</span>
        <span style="color: #374151;"><strong>Logistics Pickup:</strong> Our delivery partner will collect your package within 6-12 hours</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">2.</span>
        <span style="color: #374151;"><strong>Tracking Update:</strong> You'll receive tracking information once shipped</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">3.</span>
        <span style="color: #374151;"><strong>In Transit:</strong> Package will be on its way to your delivery address</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #3b82f6; margin-right: 8px;">4.</span>
        <span style="color: #374151;"><strong>Delivery:</strong> Expected delivery within 3-5 business days</span>
      </div>
    </div>

    ${buildActionButton({
      text: "Track Your Order",
      url: data.trackingUrl,
      color: "#10b981",
    })}

    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #92400e;">📦 Package Details</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Carefully packed with protective materials</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Quality checked before packaging</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Sealed and ready for safe transport</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Includes invoice and return instructions</span>
      </div>
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">🚚 Delivery Information</h3>
      
      <div style="background: white; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Delivery Address:</h4>
        <p style="margin: 0; color: #374151; line-height: 1.5;">
          ${data.shippingAddress.name}<br>
          ${data.shippingAddress.addressLine1}<br>
          ${
            data.shippingAddress.addressLine2
              ? `${data.shippingAddress.addressLine2}<br>`
              : ""
          }
          ${data.shippingAddress.city}, ${data.shippingAddress.state} ${
    data.shippingAddress.postalCode
  }<br>
          ${data.shippingAddress.country}
        </p>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">📞</span>
        <span style="color: #374151;">Phone: ${
          data.shippingAddress.phone
        }</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #6366f1; margin-right: 8px;">📧</span>
        <span style="color: #374151;">Email: ${data.customerEmail}</span>
      </div>
    </div>

    ${
      data.expectedDeliveryDate
        ? `
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #dc2626;">📅 Estimated Delivery</h3>
      
      <div style="text-align: center; background: white; padding: 16px; border-radius: 6px;">
        <span style="color: #ef4444; font-weight: 600; font-size: 18px;">${formatDate(
          data.expectedDeliveryDate
        )}</span>
        <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
          Expected delivery date (may vary based on location)
        </p>
      </div>
    </div>
    `
        : ""
    }

    <div style="display: flex; gap: 12px; justify-content: center; margin: 20px 0;">
      <a href="${data.trackingUrl}" 
         style="display: inline-block; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
        Track Package
      </a>
      <a href="${data.orderUrl}" 
         style="display: inline-block; padding: 10px 20px; background: white; color: #3b82f6; border: 2px solid #3b82f6; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
        View Order
      </a>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Need help with your order?
      </p>
      <a href="https://support.customercare.com/tracking" 
         style="color: #10b981; text-decoration: none; font-weight: 500;">
        Contact Customer Support
      </a>
    </div>

    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        📱 Download our mobile app for real-time delivery tracking and instant notifications.
      </p>
    </div>
  `;

  return buildEmailWrapper({
    title: "Order Packed - Ready for Shipment",
    recipientName: data.customerName,
    recipientEmail: data.customerEmail,
    content,
    headerColor: "#10b981",
  });
}
