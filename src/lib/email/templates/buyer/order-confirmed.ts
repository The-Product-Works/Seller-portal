/**
 * Order Confirmed Email Template for Buyers
 * Sent when customer places an order successfully
 */

import {
  buildEmailWrapper,
  buildActionButton,
  buildOrderItemsTable,
  buildShippingAddressSection,
  buildOrderSummarySection,
  formatCurrency,
  formatDate,
} from "../template-utils";
import type { OrderConfirmedTemplateData } from "../types";

export function generateOrderConfirmedEmail(
  data: OrderConfirmedTemplateData
): string {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #10b981; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">✓</span>
      </div>
      <h2 style="color: #10b981; margin: 0; font-size: 28px;">Order Confirmed!</h2>
    </div>

    <div style="background: #f0fdf4; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hello <strong>${data.customerName}</strong>,
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Thank you for your order! We've received your purchase and are preparing it for shipment. You'll receive another email once your order has been shipped with tracking information.
      </p>
    </div>

    ${buildOrderSummarySection({
      orderNumber: data.orderNumber,
      orderDate: formatDate(data.orderDate),
      totalAmount: data.totalAmount,
      currency: data.currency,
      orderUrl: data.orderUrl,
    })}

    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Order Items</h3>
      ${buildOrderItemsTable(data.items)}
    </div>

    ${buildShippingAddressSection(data.shippingAddress)}

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">📋 Order Information</h3>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Seller:</span>
        <span style="color: #374151;">${data.sellerName}</span>
      </div>
      
      ${
        data.estimatedDelivery
          ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-weight: 500; color: #6b7280;">Estimated Delivery:</span>
          <span style="color: #374151;">${formatDate(
            data.estimatedDelivery
          )}</span>
        </div>
      `
          : ""
      }
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
        <span style="font-weight: 500; color: #6b7280;">Customer Email:</span>
        <span style="color: #374151;">${data.customerEmail}</span>
      </div>
    </div>

    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">📦 What happens next?</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">1.</span>
        <span style="color: #374151;">Order processing and quality check (1-2 business days)</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">2.</span>
        <span style="color: #374151;">Packaging and shipping preparation</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">3.</span>
        <span style="color: #374151;">You'll receive a shipping notification with tracking details</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #3b82f6; margin-right: 8px;">4.</span>
        <span style="color: #374151;">Your order will be delivered to your address</span>
      </div>
    </div>

    ${buildActionButton({
      text: "Track Your Order",
      url: data.orderUrl,
      color: "#3b82f6",
    })}

    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #92400e;">📞 Need Help?</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Changes to your order? Contact us within 2 hours</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Questions about delivery? Check your order tracking</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Issues with your order? Our support team is here to help</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Questions about your order?
      </p>
      <a href="${data.supportUrl || "https://support.sellerportal.com"}" 
         style="color: #3b82f6; text-decoration: none; font-weight: 500;">
        Contact Customer Support
      </a>
    </div>

    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        Keep this email for your records. You can also track your order anytime using the link above.
      </p>
    </div>
  `;

  return buildEmailWrapper({
    title: "Order Confirmation",
    recipientName: data.customerName,
    recipientEmail: data.customerEmail,
    content,
    headerColor: "#10b981",
  });
}
