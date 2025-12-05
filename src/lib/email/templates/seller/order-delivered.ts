/**
 * Order Delivered Email Template for Sellers
 * Sent when an order is successfully delivered to the buyer
 */

import {
  buildEmailWrapper,
  buildActionButton,
  buildOrderItemsTable,
  formatCurrency,
  formatDate,
} from "../template-utils";
import type { OrderDeliveredTemplateData } from "../types";

export function generateOrderDeliveredEmail(
  data: OrderDeliveredTemplateData
): string {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #10b981; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">📦</span>
      </div>
      <h2 style="color: #10b981; margin: 0; font-size: 28px;">Order Delivered!</h2>
    </div>

    <div style="background: #f0fdf4; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Congratulations <strong>${data.sellerName}</strong>!
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Your order has been successfully delivered to <strong>${
          data.customerName
        }</strong>. The earnings from this sale will be added to your next payout cycle.
      </p>
    </div>

    <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #e5e7eb;">
      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #374151;">Delivery Details</h3>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Order Number:</span>
        <span style="color: #374151; font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">#${
          data.orderNumber
        }</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Customer:</span>
        <span style="color: #374151;">${data.customerName}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Delivery Date:</span>
        <span style="color: #374151;">${formatDate(data.deliveryDate)}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
        <span style="font-weight: 500; color: #6b7280;">Order Value:</span>
        <span style="color: #10b981; font-weight: 600; font-size: 16px;">${formatCurrency(
          data.totalAmount,
          data.currency
        )}</span>
      </div>
    </div>

    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Delivered Items</h3>
      ${buildOrderItemsTable(data.items)}
    </div>

    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">💰 Earnings Information</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Your earnings will be calculated after deducting platform fees</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Funds will be included in your next payout cycle</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Detailed earnings breakdown available in your dashboard</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Customer can rate and review this order for 30 days</span>
      </div>
    </div>

    ${buildActionButton({
      text: "View Order Details",
      url: data.dashboardUrl,
      color: "#10b981",
    })}

    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #92400e;">📞 Post-Delivery Best Practices</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Follow up with customers to ensure satisfaction</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Encourage customers to leave reviews</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Address any issues or concerns promptly</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Maintain good customer relationships for repeat business</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 8px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #374151;">🎉 Another Successful Sale!</h3>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        Keep up the great work! Consistent deliveries lead to better seller ratings and more sales.
      </p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Need help with order management?
      </p>
      <a href="https://support.sellerportal.com/order-management" 
         style="color: #3b82f6; text-decoration: none; font-weight: 500;">
        View Order Management Guide
      </a>
    </div>
  `;

  return buildEmailWrapper({
    title: "Order Delivered Successfully",
    recipientName: data.sellerName,
    recipientEmail: data.sellerName, // Note: email should be passed in data
    content,
    headerColor: "#10b981",
  });
}
