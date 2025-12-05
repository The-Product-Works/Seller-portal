/**
 * Return Initiated Email Template for Sellers
 * Sent when customer initiates a return request
 */

import {
  buildEmailWrapper,
  buildActionButton,
  buildOrderItemsTable,
  formatCurrency,
  formatDate,
} from "../template-utils";
import type { ReturnInitiatedSellerTemplateData } from "../types";

export function generateReturnInitiatedEmail(
  data: ReturnInitiatedSellerTemplateData
): string {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #f59e0b; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">🔄</span>
      </div>
      <h2 style="color: #f59e0b; margin: 0; font-size: 28px;">Return Request Received</h2>
    </div>

    <div style="background: #fef3c7; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hello <strong>${data.sellerName}</strong>,
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        A customer has initiated a return request for their order. Please review the return request and take appropriate action within <strong>24 hours</strong>.
      </p>
    </div>

    <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #e5e7eb;">
      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #374151;">Return Request Details</h3>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Return ID:</span>
        <span style="color: #374151; font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">#${
          data.returnId
        }</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Original Order:</span>
        <span style="color: #374151; font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">#${
          data.orderNumber
        }</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Customer:</span>
        <span style="color: #374151;">${data.customerName}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Return Reason:</span>
        <span style="color: #374151;">${data.returnReason}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Request Date:</span>
        <span style="color: #374151;">${formatDate(data.returnDate)}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Return Type:</span>
        <span style="color: #374151;">${data.returnType}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
        <span style="font-weight: 500; color: #6b7280;">Refund Amount:</span>
        <span style="color: #f59e0b; font-weight: 600; font-size: 18px;">${formatCurrency(
          data.refundAmount,
          data.currency
        )}</span>
      </div>
    </div>

    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Items for Return</h3>
      ${buildOrderItemsTable(data.returnItems)}
    </div>

    ${
      data.customerComments
        ? `
    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #1e40af;">💬 Customer Comments</h3>
      <p style="margin: 0; color: #374151; line-height: 1.6; background: white; padding: 16px; border-radius: 6px; font-style: italic;">
        "${data.customerComments}"
      </p>
    </div>
    `
        : ""
    }

    ${
      data.returnImages && data.returnImages.length > 0
        ? `
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #065f46;">📷 Customer Provided Images</h3>
      <p style="margin: 0 0 12px 0; color: #374151;">Customer has provided ${
        data.returnImages.length
      } image(s) with the return request:</p>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${data.returnImages
          .map(
            (image, index) => `
          <a href="${image}" 
             style="display: inline-block; padding: 8px 16px; background: white; color: #10b981; text-decoration: none; border-radius: 4px; border: 1px solid #10b981; font-size: 12px;">
            View Image ${index + 1}
          </a>
        `
          )
          .join("")}
      </div>
    </div>
    `
        : ""
    }

    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #dc2626;">⏰ Action Required</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #ef4444; margin-right: 8px;">1.</span>
        <span style="color: #374151;"><strong>Review Request:</strong> Examine return reason and customer comments</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #ef4444; margin-right: 8px;">2.</span>
        <span style="color: #374151;"><strong>Make Decision:</strong> Approve or decline return within 24 hours</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #ef4444; margin-right: 8px;">3.</span>
        <span style="color: #374151;"><strong>If Approved:</strong> Schedule pickup and prepare return documentation</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #ef4444; margin-right: 8px;">4.</span>
        <span style="color: #374151;"><strong>Communicate:</strong> Send response to customer with next steps</span>
      </div>
    </div>

    ${buildActionButton({
      text: "Review Return Request",
      url: data.returnUrl,
      color: "#f59e0b",
    })}

    <div style="display: flex; gap: 12px; justify-content: center; margin: 20px 0;">
      <a href="${data.approveUrl}" 
         style="display: inline-block; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
        Approve Return
      </a>
      <a href="${data.declineUrl}" 
         style="display: inline-block; padding: 10px 20px; background: white; color: #ef4444; border: 2px solid #ef4444; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
        Decline Return
      </a>
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">📋 Return Policy Guidelines</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Returns must be requested within ${
          data.returnPolicyDays || 7
        } days of delivery</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Items should be in original condition with tags/packaging</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Valid reasons: defective item, wrong size/color, not as described</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Customer satisfaction is prioritized for genuine issues</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Return shipping costs depend on return reason</span>
      </div>
    </div>

    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #92400e;">💡 Best Practices</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Respond promptly to maintain good customer relations</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Be understanding and helpful in your communication</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Document any defects or issues for quality improvement</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Consider partial refunds for minor issues when appropriate</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Use returns as feedback to improve product quality</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Questions about the return process?
      </p>
      <a href="https://support.sellerportal.com/returns" 
         style="color: #f59e0b; text-decoration: none; font-weight: 500;">
        View Return Management Guide
      </a>
    </div>

    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        🕐 Remember: Quick response to returns improves customer satisfaction and your seller rating.
      </p>
    </div>
  `;

  return buildEmailWrapper({
    title: "Return Request - Action Required",
    recipientName: data.sellerName,
    recipientEmail: data.sellerEmail,
    content,
    headerColor: "#f59e0b",
  });
}
