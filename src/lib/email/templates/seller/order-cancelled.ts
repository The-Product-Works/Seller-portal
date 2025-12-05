/**
 * Order Cancelled Email Template (Seller version)
 * Sent when seller cancels an order or receives cancellation notification
 */

import {
  buildEmailWrapper,
  buildActionButton,
  buildOrderItemsTable,
  formatCurrency,
  formatDate,
} from "../template-utils";
import type { OrderCancelledSellerTemplateData } from "../types";

export function generateOrderCancelledSellerEmail(
  data: OrderCancelledSellerTemplateData
): string {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #f59e0b; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">⚠️</span>
      </div>
      <h2 style="color: #f59e0b; margin: 0; font-size: 28px;">Order Cancelled</h2>
    </div>

    <div style="background: #fef3c7; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hello <strong>${data.sellerName}</strong>,
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        ${
          data.cancelledBy === "seller"
            ? "Your order cancellation has been processed successfully."
            : `Order #${data.orderNumber} has been cancelled by ${
                data.cancelledBy === "customer" ? "the customer" : "system"
              }.`
        } Please review the details below.
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
        <span style="font-weight: 500; color: #6b7280;">Customer:</span>
        <span style="color: #374151;">${data.customerName}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Order Date:</span>
        <span style="color: #374151;">${formatDate(data.orderDate)}</span>
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
        <span style="color: #f59e0b; font-weight: 600; font-size: 18px;">${formatCurrency(
          data.orderAmount,
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
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #dc2626;">📝 Cancellation Reason</h3>
      <p style="margin: 0; color: #374151; line-height: 1.6; background: white; padding: 16px; border-radius: 6px;">
        ${data.reason}
      </p>
    </div>
    `
        : ""
    }

    <div style="background: ${
      data.cancelledBy === "seller" ? "#f0fdf4" : "#eff6ff"
    }; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${
    data.cancelledBy === "seller" ? "#10b981" : "#3b82f6"
  };">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: ${
        data.cancelledBy === "seller" ? "#065f46" : "#1e40af"
      };">
        💼 ${
          data.cancelledBy === "seller"
            ? "Cancellation Impact"
            : "Action Required"
        }
      </h3>
      
      ${
        data.cancelledBy === "seller"
          ? `
        <div style="margin-bottom: 12px;">
          <span style="color: #10b981; margin-right: 8px;">•</span>
          <span style="color: #374151;">No payment processing fees deducted</span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <span style="color: #10b981; margin-right: 8px;">•</span>
          <span style="color: #374151;">Customer will receive full refund automatically</span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <span style="color: #10b981; margin-right: 8px;">•</span>
          <span style="color: #374151;">Inventory levels have been restored</span>
        </div>
        
        <div style="margin-bottom: 0;">
          <span style="color: #10b981; margin-right: 8px;">•</span>
          <span style="color: #374151;">Order marked as cancelled in your dashboard</span>
        </div>
      `
          : `
        <div style="margin-bottom: 12px;">
          <span style="color: #3b82f6; margin-right: 8px;">•</span>
          <span style="color: #374151;">If items were already prepared, please check inventory</span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <span style="color: #3b82f6; margin-right: 8px;">•</span>
          <span style="color: #374151;">Any packed items should be returned to stock</span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <span style="color: #3b82f6; margin-right: 8px;">•</span>
          <span style="color: #374151;">Update order status if partially processed</span>
        </div>
        
        <div style="margin-bottom: 0;">
          <span style="color: #3b82f6; margin-right: 8px;">•</span>
          <span style="color: #374151;">Customer refund will be processed automatically</span>
        </div>
      `
      }
    </div>

    ${buildActionButton({
      text: "View Order Details",
      url: data.orderUrl,
      color: data.cancelledBy === "seller" ? "#10b981" : "#f59e0b",
    })}

    ${
      data.impactOnSeller
        ? `
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">📊 Seller Impact Analysis</h3>
      
      <div style="background: white; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280;">Cancellation Rate Impact:</span>
          <span style="color: ${
            data.impactOnSeller.rateImpact === "positive"
              ? "#10b981"
              : data.impactOnSeller.rateImpact === "neutral"
              ? "#f59e0b"
              : "#ef4444"
          }; font-weight: 600;">
            ${
              data.impactOnSeller.rateImpact === "positive"
                ? "No Negative Impact"
                : data.impactOnSeller.rateImpact === "neutral"
                ? "Minimal Impact"
                : "Moderate Impact"
            }
          </span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280;">Current Cancellation Rate:</span>
          <span style="color: #374151;">${
            data.impactOnSeller.currentRate
          }%</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
          <span style="color: #6b7280;">Performance Status:</span>
          <span style="color: ${
            data.impactOnSeller.performanceStatus === "excellent"
              ? "#10b981"
              : data.impactOnSeller.performanceStatus === "good"
              ? "#f59e0b"
              : "#ef4444"
          };">
            ${
              data.impactOnSeller.performanceStatus.charAt(0).toUpperCase() +
              data.impactOnSeller.performanceStatus.slice(1)
            }
          </span>
        </div>
      </div>
      
      ${
        data.impactOnSeller.suggestions &&
        data.impactOnSeller.suggestions.length > 0
          ? `
        <div style="margin-bottom: 0;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Improvement Suggestions:</h4>
          ${data.impactOnSeller.suggestions
            .map(
              (suggestion) => `
            <div style="margin-bottom: 8px;">
              <span style="color: #6366f1; margin-right: 8px;">•</span>
              <span style="color: #374151;">${suggestion}</span>
            </div>
          `
            )
            .join("")}
        </div>
      `
          : ""
      }
    </div>
    `
        : ""
    }

    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #92400e;">💡 Prevention Tips</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Maintain accurate inventory levels to avoid stock-out cancellations</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Respond to orders promptly to reduce customer cancellations</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Provide clear product descriptions and images</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Set realistic delivery expectations</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Communicate proactively with customers about any delays</span>
      </div>
    </div>

    <div style="display: flex; gap: 12px; justify-content: center; margin: 20px 0;">
      <a href="${data.dashboardUrl}" 
         style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
        Go to Dashboard
      </a>
      <a href="${data.inventoryUrl}" 
         style="display: inline-block; padding: 10px 20px; background: white; color: #f59e0b; border: 2px solid #f59e0b; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
        Manage Inventory
      </a>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Need help reducing cancellations?
      </p>
      <a href="https://support.sellerportal.com/order-management" 
         style="color: #f59e0b; text-decoration: none; font-weight: 500;">
        View Seller Resources
      </a>
    </div>

    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        📊 Track your performance metrics and get personalized improvement tips in your seller dashboard.
      </p>
    </div>
  `;

  return buildEmailWrapper({
    title: "Order Cancelled",
    recipientName: data.sellerName,
    recipientEmail: data.sellerEmail,
    content,
    headerColor: "#f59e0b",
  });
}
