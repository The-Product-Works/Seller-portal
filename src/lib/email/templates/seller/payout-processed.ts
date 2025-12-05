/**
 * Payout Processed Email Template for Sellers
 * Sent when earnings transfer is completed
 */

import {
  buildEmailWrapper,
  buildActionButton,
  formatCurrency,
  formatDate,
} from "../template-utils";
import type { PayoutProcessedTemplateData } from "../types";

export function generatePayoutProcessedEmail(
  data: PayoutProcessedTemplateData
): string {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #10b981; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">💰</span>
      </div>
      <h2 style="color: #10b981; margin: 0; font-size: 28px;">Payout Processed!</h2>
    </div>

    <div style="background: #f0fdf4; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Great news <strong>${data.sellerName}</strong>!
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Your earnings have been successfully transferred to your registered payment method. The funds should reflect in your account within 1-3 business days.
      </p>
    </div>

    <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #e5e7eb;">
      <h3 style="margin: 0 0 20px 0; font-size: 20px; color: #374151; text-align: center;">Payout Summary</h3>
      
      <div style="text-align: center; margin: 24px 0;">
        <div style="font-size: 36px; font-weight: 700; color: #10b981; margin-bottom: 8px;">
          ${formatCurrency(data.amount, data.currency)}
        </div>
        <div style="font-size: 14px; color: #6b7280;">
          Successfully transferred
        </div>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-weight: 500; color: #6b7280;">Transaction ID:</span>
          <span style="color: #374151; font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${
            data.transactionId
          }</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-weight: 500; color: #6b7280;">Payout Date:</span>
          <span style="color: #374151;">${formatDate(data.payoutDate)}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-weight: 500; color: #6b7280;">Payment Method:</span>
          <span style="color: #374151;">${data.paymentMethod}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
          <span style="font-weight: 500; color: #6b7280;">Period:</span>
          <span style="color: #374151;">${data.payoutPeriod}</span>
        </div>
      </div>
    </div>

    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">📋 Important Information</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Funds typically arrive within 1-3 business days</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Keep the transaction ID for your records</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">You'll receive a detailed earnings report in your dashboard</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Contact support if funds don't arrive within 5 business days</span>
      </div>
    </div>

    ${buildActionButton({
      text: "View Earnings Dashboard",
      url: data.dashboardUrl,
      color: "#10b981",
    })}

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">💡 Maximize Your Earnings</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Add more products to increase sales</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Optimize product descriptions and photos</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Maintain good seller ratings for better visibility</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #6366f1; margin-right: 8px;">•</span>
        <span style="color: #374151;">Respond quickly to customer inquiries</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Questions about your payout?
      </p>
      <a href="https://support.sellerportal.com/payouts" 
         style="color: #3b82f6; text-decoration: none; font-weight: 500;">
        View Payout Help Center
      </a>
    </div>

    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
        🔒 Your financial information is secure and encrypted. We never store your complete payment details.
      </p>
    </div>
  `;

  return buildEmailWrapper({
    title: "Payout Processed",
    recipientName: data.sellerName,
    recipientEmail: data.sellerName, // Note: email should be passed in data
    content,
    headerColor: "#10b981",
  });
}
