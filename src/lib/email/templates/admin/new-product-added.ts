/**
 * Admin New Product Added Email Template
 * Sent when seller adds a new product for approval
 */

import {
  buildEmailWrapper,
  buildActionButton,
  formatDate,
} from "../template-utils";
import type { AdminNewProductTemplateData } from "../types";

export function generateAdminNewProductEmail(
  data: AdminNewProductTemplateData
): string {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #3b82f6; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">📦</span>
      </div>
      <h2 style="color: #3b82f6; margin: 0; font-size: 28px;">New Product Submitted</h2>
    </div>

    <div style="background: #eff6ff; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #3b82f6;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hello <strong>${data.adminName}</strong>,
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        A seller has submitted a new product for review and approval. Please review the product details and approve or reject as necessary.
      </p>
    </div>

    <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #e5e7eb;">
      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #374151;">Product Details</h3>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Product Name:</span>
        <span style="color: #374151; font-weight: 600;">${
          data.productName
        }</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Category:</span>
        <span style="color: #374151;">${data.productCategory}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Seller:</span>
        <span style="color: #374151;">${data.sellerName}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Submission Date:</span>
        <span style="color: #374151;">${formatDate(data.submissionDate)}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
        <span style="font-weight: 500; color: #6b7280;">Status:</span>
        <span style="color: #f59e0b; font-weight: 600; background: #fef3c7; padding: 2px 8px; border-radius: 12px; font-size: 12px;">PENDING REVIEW</span>
      </div>
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">📋 Review Checklist</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">□</span>
        <span style="color: #374151;">Product images are clear and accurate</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">□</span>
        <span style="color: #374151;">Product description is complete and accurate</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">□</span>
        <span style="color: #374151;">Pricing is reasonable and competitive</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">□</span>
        <span style="color: #374151;">Product category is appropriate</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">□</span>
        <span style="color: #374151;">Seller has necessary documentation</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #3b82f6; margin-right: 8px;">□</span>
        <span style="color: #374151;">Product complies with platform policies</span>
      </div>
    </div>

    ${buildActionButton({
      text: "Review Product",
      url: data.approvalUrl,
      color: "#3b82f6",
    })}

    <div style="display: flex; gap: 12px; justify-content: center; margin: 20px 0;">
      <a href="${data.productUrl}" 
         style="display: inline-block; padding: 10px 20px; background: white; color: #6b7280; border: 2px solid #e5e7eb; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
        View Product Details
      </a>
    </div>

    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #92400e;">⏰ Action Required</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Products should be reviewed within 48 hours of submission</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Sellers are waiting for approval to start selling</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Delayed reviews may impact seller satisfaction</span>
      </div>
    </div>

    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #065f46;">💡 Quick Actions</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #10b981; margin-right: 8px;">✓</span>
        <span style="color: #374151;"><strong>Approve:</strong> If product meets all requirements</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #ef4444; margin-right: 8px;">✗</span>
        <span style="color: #374151;"><strong>Reject:</strong> If product violates policies or needs changes</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #f59e0b; margin-right: 8px;">?</span>
        <span style="color: #374151;"><strong>Request Changes:</strong> If minor modifications are needed</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Need help with product review guidelines?
      </p>
      <a href="https://admin.sellerportal.com/guidelines" 
         style="color: #3b82f6; text-decoration: none; font-weight: 500;">
        View Review Guidelines
      </a>
    </div>

    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        📧 This notification was sent because you are an admin reviewer. Update your notification preferences in admin settings.
      </p>
    </div>
  `;

  return buildEmailWrapper({
    title: "New Product for Review",
    recipientName: data.adminName,
    recipientEmail: data.adminName, // Note: email should be passed in data
    content,
    headerColor: "#3b82f6",
  });
}
