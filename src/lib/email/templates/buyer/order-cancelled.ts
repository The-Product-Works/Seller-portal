/**
 * Order Cancelled Email Template (Buyer version)
 * Sent when an order is cancelled by seller or system
 */

import {
  buildEmailWrapper,
  buildActionButton,
  buildOrderItemsTable,
  formatCurrency,
  formatDate,
} from "../template-utils";
import type { OrderCancelledBuyerTemplateData } from "../types";

export function generateOrderCancelledBuyerEmail(
  data: OrderCancelledBuyerTemplateData
): string {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #ef4444; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">❌</span>
      </div>
      <h2 style="color: #ef4444; margin: 0; font-size: 28px;">Order Cancelled</h2>
    </div>

    <div style="background: #fef2f2; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #ef4444;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Dear <strong>${data.customerName}</strong>,
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        We regret to inform you that your order has been cancelled. ${
          data.reason || "We apologize for any inconvenience this may cause."
        }
      </p>
    </div>

    <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #e5e7eb;">
      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #374151;">Cancelled Order Details</h3>
      
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
        <span style="font-weight: 500; color: #6b7280;">Cancellation Date:</span>
        <span style="color: #374151;">${formatDate(
          data.cancellationDate
        )}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Cancelled By:</span>
        <span style="color: #374151;">${data.cancelledBy}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
        <span style="font-weight: 500; color: #6b7280;">Order Amount:</span>
        <span style="color: #ef4444; font-weight: 600; font-size: 18px;">${formatCurrency(
          data.refundAmount,
          data.currency
        )}</span>
      </div>
    </div>

    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Cancelled Items</h3>
      ${buildOrderItemsTable(data.items)}
    </div>

    ${
      data.reason
        ? `
    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #92400e;">📝 Cancellation Reason</h3>
      <p style="margin: 0; color: #374151; line-height: 1.6; background: white; padding: 16px; border-radius: 6px;">
        ${data.reason}
      </p>
    </div>
    `
        : ""
    }

    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #065f46;">💰 Refund Information</h3>
      
      <div style="background: white; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280;">Refund Amount:</span>
          <span style="color: #10b981; font-weight: 600;">${formatCurrency(
            data.refundAmount,
            data.currency
          )}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280;">Refund Method:</span>
          <span style="color: #374151;">${data.refundMethod}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
          <span style="color: #6b7280;">Processing Time:</span>
          <span style="color: #374151;">${data.refundProcessingTime}</span>
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #10b981; margin-right: 8px;">•</span>
        <span style="color: #374151;">Full refund will be processed automatically</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #10b981; margin-right: 8px;">•</span>
        <span style="color: #374151;">You'll receive confirmation once refund is initiated</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #10b981; margin-right: 8px;">•</span>
        <span style="color: #374151;">Check your original payment method for credit</span>
      </div>
    </div>

    ${buildActionButton({
      text: "Shop Similar Items",
      url: data.shopUrl,
      color: "#3b82f6",
    })}

    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #1e40af;">🛍️ Continue Shopping</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Browse similar products from other sellers</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Check out today's deals and offers</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Save items to your wishlist for later</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Get notified when items are back in stock</span>
      </div>
    </div>

    <div style="display: flex; gap: 12px; justify-content: center; margin: 20px 0;">
      <a href="${data.shopUrl}" 
         style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
        Browse Products
      </a>
      <a href="${data.ordersUrl}" 
         style="display: inline-block; padding: 10px 20px; background: white; color: #10b981; border: 2px solid #10b981; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
        View Orders
      </a>
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">❓ Need Help?</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">📞</span>
        <span style="color: #374151;">Contact customer support for assistance</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">💬</span>
        <span style="color: #374151;">Live chat available 24/7 for immediate help</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">📧</span>
        <span style="color: #374151;">Email us about refund or cancellation queries</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #6366f1; margin-right: 8px;">🔄</span>
        <span style="color: #374151;">Track your refund status in account dashboard</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Questions about your cancellation or refund?
      </p>
      <a href="https://support.customercare.com/cancellations" 
         style="color: #ef4444; text-decoration: none; font-weight: 500;">
        Contact Customer Support
      </a>
    </div>

    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        We appreciate your understanding and look forward to serving you again in the future.
      </p>
    </div>
  `;

  return buildEmailWrapper({
    title: "Order Cancelled",
    recipientName: data.customerName,
    recipientEmail: data.customerEmail,
    content,
    headerColor: "#ef4444",
  });
}
