/**
 * Admin KYC Submitted Email Template
 * Sent when seller submits KYC documents for verification
 */

import {
  buildEmailWrapper,
  buildActionButton,
  formatDate,
} from "../template-utils";
import type { AdminKYCSubmittedTemplateData } from "../types";

export function generateAdminKYCSubmittedEmail(
  data: AdminKYCSubmittedTemplateData
): string {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #f59e0b; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">📄</span>
      </div>
      <h2 style="color: #f59e0b; margin: 0; font-size: 28px;">KYC Documents Submitted</h2>
    </div>

    <div style="background: #fffbeb; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hello <strong>${data.adminName}</strong>,
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        A seller has submitted their KYC (Know Your Customer) documents for verification. Please review the documents and approve or request additional information as needed.
      </p>
    </div>

    <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #e5e7eb;">
      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #374151;">Seller Information</h3>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Seller Name:</span>
        <span style="color: #374151; font-weight: 600;">${
          data.sellerName
        }</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Email:</span>
        <span style="color: #374151;">${data.sellerEmail}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Submission Date:</span>
        <span style="color: #374151;">${formatDate(data.submissionDate)}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
        <span style="font-weight: 500; color: #6b7280;">Status:</span>
        <span style="color: #f59e0b; font-weight: 600; background: #fef3c7; padding: 2px 8px; border-radius: 12px; font-size: 12px;">PENDING VERIFICATION</span>
      </div>
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">📋 Submitted Documents</h3>
      
      ${data.documentsSubmitted
        .map(
          (doc, index) => `
        <div style="display: flex; align-items: center; margin-bottom: ${
          index === data.documentsSubmitted.length - 1 ? "0" : "12px"
        };">
          <span style="color: #10b981; margin-right: 12px; font-size: 16px;">✓</span>
          <span style="color: #374151; font-weight: 500;">${doc}</span>
        </div>
      `
        )
        .join("")}
    </div>

    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">🔍 Verification Checklist</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">□</span>
        <span style="color: #374151;">Identity document is valid and not expired</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">□</span>
        <span style="color: #374151;">Address proof matches provided information</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">□</span>
        <span style="color: #374151;">Business registration documents are authentic</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">□</span>
        <span style="color: #374151;">Tax information is complete and accurate</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">□</span>
        <span style="color: #374151;">Bank account details are verified</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #3b82f6; margin-right: 8px;">□</span>
        <span style="color: #374151;">All required fields are completed</span>
      </div>
    </div>

    ${buildActionButton({
      text: "Review KYC Documents",
      url: data.reviewUrl,
      color: "#f59e0b",
    })}

    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #991b1b;">⚠️ Important Security Guidelines</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #ef4444; margin-right: 8px;">•</span>
        <span style="color: #374151;">Verify document authenticity using appropriate tools</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #ef4444; margin-right: 8px;">•</span>
        <span style="color: #374151;">Cross-check information with government databases when possible</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #ef4444; margin-right: 8px;">•</span>
        <span style="color: #374151;">Look for signs of document tampering or forgery</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #ef4444; margin-right: 8px;">•</span>
        <span style="color: #374151;">Ensure all personal information matches across documents</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #ef4444; margin-right: 8px;">•</span>
        <span style="color: #374151;">Flag suspicious submissions for additional review</span>
      </div>
    </div>

    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #065f46;">🚀 Quick Actions</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #10b981; margin-right: 8px;">✓</span>
        <span style="color: #374151;"><strong>Approve:</strong> If all documents are verified and complete</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #ef4444; margin-right: 8px;">✗</span>
        <span style="color: #374151;"><strong>Reject:</strong> If documents are invalid or suspicious</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #f59e0b; margin-right: 8px;">?</span>
        <span style="color: #374151;"><strong>Request More Info:</strong> If additional documents or clarification needed</span>
      </div>
    </div>

    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #92400e;">⏰ Timeline Requirements</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">KYC reviews should be completed within 2-3 business days</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Sellers cannot start selling until KYC is approved</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Delayed verifications impact seller onboarding experience</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #f59e0b; margin-right: 8px;">•</span>
        <span style="color: #374151;">Complex cases may require additional time for thorough review</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Need help with KYC verification process?
      </p>
      <a href="https://admin.sellerportal.com/kyc-guidelines" 
         style="color: #3b82f6; text-decoration: none; font-weight: 500;">
        View KYC Guidelines
      </a>
    </div>

    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        🔒 All KYC information is confidential and stored securely. Follow data protection protocols during review.
      </p>
    </div>
  `;

  return buildEmailWrapper({
    title: "KYC Documents for Review",
    recipientName: data.adminName,
    recipientEmail: data.adminName, // Note: email should be passed in data
    content,
    headerColor: "#f59e0b",
  });
}
