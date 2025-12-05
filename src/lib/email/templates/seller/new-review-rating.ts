/**
 * New Review/Rating Email Template for Sellers
 * Sent when a buyer rates and reviews the seller's product
 */

import {
  buildEmailWrapper,
  buildActionButton,
  buildStatusBadge,
  formatDate,
} from "../template-utils";
import { getRatingStars } from "../utils";
import type { NewReviewRatingTemplateData } from "../types";

export function generateNewReviewRatingEmail(
  data: NewReviewRatingTemplateData
): string {
  const ratingColor =
    data.rating >= 4 ? "#10b981" : data.rating >= 3 ? "#f59e0b" : "#ef4444";

  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: ${ratingColor}; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px;">⭐</span>
      </div>
      <h2 style="color: ${ratingColor}; margin: 0; font-size: 28px;">New Review Received!</h2>
    </div>

    <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hello <strong>${data.sellerName}</strong>,
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Great news! You've received a new review from a customer. Reviews help build trust with potential buyers and improve your seller reputation.
      </p>
    </div>

    <div style="background: white; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #e5e7eb;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 18px; color: #374151;">Review Details</h3>
        ${buildStatusBadge(
          `${data.rating}/5 Stars`,
          data.rating >= 4 ? "success" : data.rating >= 3 ? "warning" : "error"
        )}
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <div style="font-size: 24px; color: ${ratingColor}; margin-bottom: 8px;">
          ${getRatingStars(data.rating)}
        </div>
        <div style="font-size: 18px; font-weight: 600; color: ${ratingColor};">
          ${data.rating}.0 out of 5
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <span style="font-weight: 500; color: #6b7280;">Customer:</span>
        <span style="color: #374151; margin-left: 8px;">${
          data.customerName
        }</span>
      </div>

      <div style="margin-bottom: 16px;">
        <span style="font-weight: 500; color: #6b7280;">Product:</span>
        <span style="color: #374151; margin-left: 8px;">${
          data.productName
        }</span>
      </div>

      <div style="margin-bottom: 16px;">
        <span style="font-weight: 500; color: #6b7280;">Order:</span>
        <span style="color: #374151; margin-left: 8px;">#${
          data.orderNumber
        }</span>
      </div>

      <div style="margin-bottom: 16px;">
        <span style="font-weight: 500; color: #6b7280;">Review Date:</span>
        <span style="color: #374151; margin-left: 8px;">${formatDate(
          data.reviewDate
        )}</span>
      </div>

      ${
        data.review
          ? `
        <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin-top: 20px;">
          <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">Customer Review:</h4>
          <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6; font-style: italic;">
            "${data.review}"
          </p>
        </div>
      `
          : ""
      }
    </div>

    ${
      data.rating >= 4
        ? `
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #065f46;">🎉 Excellent Rating!</h3>
        <p style="margin: 0; font-size: 14px; color: #047857;">
          This positive review will help boost your seller rating and attract more customers to your products.
        </p>
      </div>
    `
        : data.rating >= 3
        ? `
      <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #92400e;">📈 Room for Improvement</h3>
        <p style="margin: 0; font-size: 14px; color: #d97706;">
          Consider reaching out to understand how you can improve the customer experience for future orders.
        </p>
      </div>
    `
        : `
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #991b1b;">⚠️ Low Rating Alert</h3>
        <p style="margin: 0; font-size: 14px; color: #dc2626;">
          This review may impact your seller rating. Consider reaching out to the customer to address their concerns and improve future experiences.
        </p>
      </div>
    `
    }

    ${buildActionButton({
      text: "View Review in Dashboard",
      url: data.dashboardUrl,
      color: ratingColor,
    })}

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #374151;">Tips for Better Reviews</h3>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Ensure accurate product descriptions</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Package products carefully</span>
      </div>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Ship orders promptly</span>
      </div>
      
      <div style="margin-bottom: 0;">
        <span style="color: #3b82f6; margin-right: 8px;">•</span>
        <span style="color: #374151;">Provide excellent customer service</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Want to improve your seller performance?
      </p>
      <a href="https://support.sellerportal.com/seller-tips" 
         style="color: #3b82f6; text-decoration: none; font-weight: 500;">
        View Seller Best Practices
      </a>
    </div>
  `;

  return buildEmailWrapper({
    title: "New Review Received",
    recipientName: data.sellerName,
    recipientEmail: data.sellerName, // Note: email should be passed in data
    content,
    headerColor: ratingColor,
  });
}
