/**
 * Welcome Seller Email Template
 * Sent to new sellers after successful registration
 */

import { WelcomeSellerTemplateData } from '@/lib/email/types';
import { buildEmailWrapper, buildActionButton } from '@/lib/email/template-utils';

export function generateWelcomeSellerEmail(data: WelcomeSellerTemplateData): {
  subject: string;
  html: string;
} {
  const subject = `Welcome to TruProMart - Let's Get Started! 🎉`;

  const cardContent = `
    <!-- Welcome Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 40px;">🎉</span>
      </div>
    </div>

    <!-- Main Message -->
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827; text-align: center;">
      Welcome to TruProMart!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #6B7280; text-align: center; line-height: 1.6;">
      Hi <strong>${data.sellerName}</strong>! We're excited to have you join our marketplace. Let's help you get started on your selling journey.
    </p>

    ${
      data.businessName
        ? `
    <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0; color: #6B7280; font-size: 14px;">Business Name</p>
      <p style="margin: 4px 0 0 0; font-weight: 600; color: #111827; font-size: 18px;">${data.businessName}</p>
    </div>
    `
        : ''
    }

    <!-- Next Steps -->
    <div style="background: #EFF6FF; padding: 24px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 16px 0; font-weight: 600; color: #1E40AF; font-size: 18px; text-align: center;">
        📋 Getting Started Checklist
      </p>
      <div style="color: #1E3A8A; font-size: 14px;">
        <div style="padding: 12px; background: white; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center;">
          <span style="margin-right: 12px; font-size: 20px;">1️⃣</span>
          <div>
            <strong>Complete KYC Verification</strong>
            <div style="color: #6B7280; font-size: 13px;">Required to start selling (usually verified within 24 hours)</div>
          </div>
        </div>
        <div style="padding: 12px; background: white; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center;">
          <span style="margin-right: 12px; font-size: 20px;">2️⃣</span>
          <div>
            <strong>Set Up Your Store</strong>
            <div style="color: #6B7280; font-size: 13px;">Add your business details and branding</div>
          </div>
        </div>
        <div style="padding: 12px; background: white; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center;">
          <span style="margin-right: 12px; font-size: 20px;">3️⃣</span>
          <div>
            <strong>List Your Products</strong>
            <div style="color: #6B7280; font-size: 13px;">Start adding products to your catalog</div>
          </div>
        </div>
        <div style="padding: 12px; background: white; border-radius: 6px; display: flex; align-items: center;">
          <span style="margin-right: 12px; font-size: 20px;">4️⃣</span>
          <div>
            <strong>Start Selling!</strong>
            <div style="color: #6B7280; font-size: 13px;">Go live and start receiving orders</div>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA Buttons -->
    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.kycUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 8px;">
        🔐 Complete KYC Now
      </a>
      <a href="${data.dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 8px;">
        📊 Go to Dashboard
      </a>
    </div>

    <!-- Benefits -->
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 12px 0; font-weight: 600; color: #111827; font-size: 16px;">
        ✨ Why Sell on TruProMart?
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #6B7280; font-size: 14px; line-height: 1.8;">
        <li>Reach millions of health-conscious customers</li>
        <li>Easy-to-use seller dashboard</li>
        <li>Fast and reliable payouts</li>
        <li>24/7 seller support</li>
        <li>Marketing tools to grow your business</li>
      </ul>
    </div>

    <!-- Support -->
    <div style="background: white; padding: 20px; border: 2px solid #667eea; border-radius: 8px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827; font-size: 16px;">
        📞 Need Help?
      </p>
      <p style="margin: 0; color: #6B7280; font-size: 14px;">
        Our seller support team is here to help you succeed.<br/>
        Email us at <a href="mailto:${data.supportEmail}" style="color: #667eea; text-decoration: none; font-weight: 600;">${data.supportEmail}</a>
      </p>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #6B7280; text-align: center;">
      We're here to support your success every step of the way! 🚀
    </p>
  `;

  const html = buildEmailWrapper({
    title: subject,
    recipientName: data.sellerName,
    recipientEmail: data.sellerEmail,
    content: cardContent,
  });

  return { subject, html };
}
