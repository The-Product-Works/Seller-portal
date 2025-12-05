/**
 * Quality Check Email Template for Buyers
 * Sent when order passes or fails quality inspection
 */

import {
  buildEmailWrapper,
  buildActionButton,
  buildOrderItemsTable,
  buildStatusBadge,
  formatDate,
} from "../template-utils";
import type { QualityCheckTemplateData } from "../types";

export function generateQualityCheckEmail(
  data: QualityCheckTemplateData
): string {
  const isPassed = data.status === "passed";
  const statusColor = isPassed ? "#10b981" : "#ef4444";
  const bgColor = isPassed ? "#f0fdf4" : "#fef2f2";
  const borderColor = isPassed ? "#10b981" : "#ef4444";

  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: ${statusColor}; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">${
          isPassed ? "✓" : "✗"
        }</span>
      </div>
      <h2 style="color: ${statusColor}; margin: 0; font-size: 28px;">
        Quality Check ${isPassed ? "Passed" : "Failed"}
      </h2>
    </div>

    <div style="background: ${bgColor}; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid ${borderColor};">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hello <strong>${data.customerName}</strong>,
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        ${
          isPassed
            ? "Good news! Your order has successfully passed our quality inspection and is now being prepared for shipment."
            : "We regret to inform you that your order did not pass our quality inspection. We are working to resolve this issue promptly."
        }
      </p>
    </div>

    <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #e5e7eb;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 18px; color: #374151;">Quality Check Results</h3>
        ${buildStatusBadge(
          isPassed ? "Passed" : "Failed",
          isPassed ? "success" : "error"
        )}
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Order Number:</span>
        <span style="color: #374151; font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">#${
          data.orderNumber
        }</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Check Date:</span>
        <span style="color: #374151;">${formatDate(data.checkDate)}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Status:</span>
        <span style="color: ${statusColor}; font-weight: 600; text-transform: uppercase;">${
    data.status
  }</span>
      </div>
    </div>

    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Inspected Items</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151;">Product</th>
            <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">Quantity</th>
            <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">Status</th>
            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151;">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (item) => `
            <tr>
              <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb;">
                <span style="font-weight: 500;">${item.name}</span>
              </td>
              <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                ${item.quantity}
              </td>
              <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                ${buildStatusBadge(
                  item.status,
                  item.status === "passed" ? "success" : "error"
                )}
              </td>
              <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                ${item.notes || "No additional notes"}
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>

    ${
      isPassed
        ? `
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #065f46;">🎉 What's Next?</h3>
        
        <div style="margin-bottom: 12px;">
          <span style="color: #10b981; margin-right: 8px;">1.</span>
          <span style="color: #374151;">Your order is being prepared for shipment</span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <span style="color: #10b981; margin-right: 8px;">2.</span>
          <span style="color: #374151;">You'll receive shipping notification with tracking details</span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <span style="color: #10b981; margin-right: 8px;">3.</span>
          <span style="color: #374151;">Expected shipping within 1-2 business days</span>
        </div>
        
        <div style="margin-bottom: 0;">
          <span style="color: #10b981; margin-right: 8px;">4.</span>
          <span style="color: #374151;">${data.nextSteps}</span>
        </div>
      </div>
    `
        : `
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #991b1b;">⚠️ Quality Issue Detected</h3>
        
        <div style="margin-bottom: 16px;">
          <span style="color: #374151; font-weight: 500;">Issue Details:</span>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
            Our quality team identified issues with one or more items in your order. We are committed to delivering only the best products to our customers.
          </p>
        </div>
        
        <div style="margin-bottom: 16px;">
          <span style="color: #374151; font-weight: 500;">Next Steps:</span>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
            ${data.nextSteps}
          </p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <span style="color: #ef4444; margin-right: 8px;">•</span>
          <span style="color: #374151;">We are sourcing a replacement product</span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <span style="color: #ef4444; margin-right: 8px;">•</span>
          <span style="color: #374151;">You can choose to wait for replacement or request a full refund</span>
        </div>
        
        <div style="margin-bottom: 0;">
          <span style="color: #ef4444; margin-right: 8px;">•</span>
          <span style="color: #374151;">Our customer service team will contact you within 24 hours</span>
        </div>
      </div>
    `
    }

    ${buildActionButton({
      text: "View Order Details",
      url: data.orderUrl,
      color: statusColor,
    })}

    ${
      !isPassed
        ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://support.sellerportal.com/quality-issues" 
           style="display: inline-block; padding: 12px 24px; background: white; color: #ef4444; border: 2px solid #ef4444; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Contact Support
        </a>
      </div>
    `
        : ""
    }

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">📋 Quality Assurance</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Every order undergoes thorough quality inspection</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">We check for product condition, authenticity, and completeness</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Our goal is to ensure 100% customer satisfaction</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Quality issues are rare but taken very seriously</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Questions about quality check process?
      </p>
      <a href="https://support.sellerportal.com/quality-process" 
         style="color: #3b82f6; text-decoration: none; font-weight: 500;">
        Learn More About Our Quality Process
      </a>
    </div>

    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        ${
          isPassed
            ? "✅ Thank you for choosing us. We ensure every product meets our high-quality standards."
            : "🛡️ Your satisfaction is our priority. We will resolve this issue as quickly as possible."
        }
      </p>
    </div>
  `;

  return buildEmailWrapper({
    title: `Quality Check ${isPassed ? "Passed" : "Failed"}`,
    recipientName: data.customerName,
    recipientEmail: data.customerName, // Note: email should be passed in data
    content,
    headerColor: statusColor,
  });
}
