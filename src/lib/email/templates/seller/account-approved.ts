/**
 * Account Approved Email Template for Sellers
 * Sent after successful KYC verification and onboarding completion
 */

import {
  buildEmailWrapper,
  buildActionButton,
  formatDate,
} from "../template-utils";
import type { AccountApprovedTemplateData } from "../types";

export function generateAccountApprovedEmail(
  data: AccountApprovedTemplateData
): string {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #10b981; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 40px;">✓</span>
      </div>
      <h2 style="color: #10b981; margin: 0; font-size: 28px;">Account Approved!</h2>
    </div>

    <div style="background: #f0fdf4; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        <strong>Congratulations ${data.sellerName}!</strong>
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Your seller account has been successfully verified and approved. You can now start selling your products on our platform and reach thousands of customers.
      </p>
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Account Details</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Seller Name:</span>
        <span style="color: #374151; margin-left: 8px;">${
          data.sellerName
        }</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Email:</span>
        <span style="color: #374151; margin-left: 8px;">${
          data.sellerEmail
        }</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="font-weight: 500; color: #6b7280;">Approval Date:</span>
        <span style="color: #374151; margin-left: 8px;">${formatDate(
          data.approvalDate
        )}</span>
      </div>
    </div>

    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">What's Next?</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">1.</span>
        <span style="color: #374151;">Add your first product to start selling</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">2.</span>
        <span style="color: #374151;">Set up your payout preferences</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">3.</span>
        <span style="color: #374151;">Configure your shipping settings</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #3b82f6; margin-right: 8px;">4.</span>
        <span style="color: #374151;">Start receiving orders from customers</span>
      </div>
    </div>

    ${buildActionButton({
      text: "Access Seller Dashboard",
      url: data.dashboardUrl,
      color: "#10b981",
    })}

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Need help getting started?
      </p>
      <a href="${data.supportUrl || "https://support.sellerportal.com"}" 
         style="color: #3b82f6; text-decoration: none; font-weight: 500;">
        Contact our support team
      </a>
    </div>

    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        Welcome to our seller community! We're excited to have you on board.
      </p>
    </div>
  `;

  return buildEmailWrapper({
    title: "Account Approved",
    recipientName: data.sellerName,
    recipientEmail: data.sellerEmail,
    content,
    headerColor: "#10b981",
  });
}
