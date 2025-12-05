/**
 * New Order Received Email Template for Sellers
 * Sent when seller receives a new order
 */

import {
  buildEmailWrapper,
  buildActionButton,
  buildOrderItemsTable,
  buildShippingAddressSection,
  formatCurrency,
  formatDate,
} from "../template-utils";
import type { NewOrderSellerTemplateData } from "../types";

export function generateNewOrderReceivedEmail(
  data: NewOrderSellerTemplateData
): string {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #3b82f6; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">🛒</span>
      </div>
      <h2 style="color: #3b82f6; margin: 0; font-size: 28px;">New Order Received!</h2>
    </div>

    <div style="background: #eff6ff; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #3b82f6;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hello <strong>${data.sellerName}</strong>,
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Great news! You have received a new order from <strong>${
          data.customerName
        }</strong>. Please prepare the items for shipment and update the order status accordingly.
      </p>
    </div>

    <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #e5e7eb;">
      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #374151;">Order Details</h3>
      
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
        <span style="font-weight: 500; color: #6b7280;">Order Date:</span>
        <span style="color: #374151;">${formatDate(data.orderDate)}</span>
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
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Ordered Items</h3>
      ${buildOrderItemsTable(data.items)}
    </div>

    ${buildShippingAddressSection(data.shippingAddress)}

    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #065f46;">📋 Next Steps</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #10b981; margin-right: 8px;">1.</span>
        <span style="color: #374151;"><strong>Confirm Order:</strong> Accept or reject the order within 2 hours</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #10b981; margin-right: 8px;">2.</span>
        <span style="color: #374151;"><strong>Prepare Items:</strong> Quality check and packaging</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #10b981; margin-right: 8px;">3.</span>
        <span style="color: #374151;"><strong>Update Status:</strong> Mark as packed when ready</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #10b981; margin-right: 8px;">4.</span>
        <span style="color: #374151;"><strong>Ship Order:</strong> Hand over to logistics partner</span>
      </div>
    </div>

    ${buildActionButton({
      text: "Manage Order",
      url: data.sellerDashboardUrl,
      color: "#3b82f6",
    })}

    <div style="display: flex; gap: 12px; justify-content: center; margin: 20px 0;">
      <a href="${data.orderUrl}" 
         style="display: inline-block; padding: 10px 20px; background: white; color: #10b981; border: 2px solid #10b981; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
        Accept Order
      </a>
      <a href="${data.orderUrl}" 
         style="display: inline-block; padding: 10px 20px; background: white; color: #ef4444; border: 2px solid #ef4444; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
        Reject Order
      </a>
    </div>

    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #92400e;">⏰ Time Sensitive</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Please respond within <strong>2 hours</strong> to maintain good seller rating</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Late responses may result in automatic order cancellation</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Customer expects order processing within 24 hours</span>
      </div>
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">💡 Pro Tips</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Double-check item availability before confirming</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Verify shipping address for accuracy</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Ensure proper packaging for safe delivery</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Communicate with customer for any clarifications</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Questions about order management?
      </p>
      <a href="https://support.sellerportal.com/order-management" 
         style="color: #3b82f6; text-decoration: none; font-weight: 500;">
        View Order Management Guide
      </a>
    </div>

    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        📱 You can also manage this order through the mobile app for quick updates on the go.
      </p>
    </div>
  `;

  return buildEmailWrapper({
    title: "New Order Received",
    recipientName: data.sellerName,
    recipientEmail: data.sellerEmail,
    content,
    headerColor: "#3b82f6",
  });
}
