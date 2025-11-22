/**
 * Email Template: New Review/Rating (Seller)
 * Sent when buyer rates the seller
 */

export interface NewReviewData {
  sellerName: string;
  rating: number; // 1-5
  reviewTitle?: string;
  reviewText: string;
  reviewerName: string;
  productName: string;
  reviewDate: string;
  orderNumber: string;
  dashboardUrl?: string;
}

export function generateNewReviewEmail(data: NewReviewData): string {
  // Generate star rating HTML
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < data.rating) {
      return "⭐";
    }
    return "☆";
  }).join("");

  const ratingColor =
    data.rating >= 4 ? "#10b981" : data.rating >= 3 ? "#f59e0b" : "#ef4444";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Review Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ⭐ New Review Received
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
                Hello <strong>${data.sellerName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
                You have received a new review from a customer!
              </p>

              <!-- Rating Card -->
              <div style="background-color: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <div style="text-align: center; margin-bottom: 15px;">
                  <div style="font-size: 48px; color: ${ratingColor};">
                    ${stars}
                  </div>
                  <div style="font-size: 32px; font-weight: bold; color: ${ratingColor}; margin-top: 10px;">
                    ${data.rating}.0 / 5.0
                  </div>
                </div>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Reviewer:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.reviewerName}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Product:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.productName}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Order:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.orderNumber}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Date:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.reviewDate}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Review Content -->
              ${
                data.reviewTitle
                  ? `
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                "${data.reviewTitle}"
              </h3>
              `
                  : ""
              }

              <div style="background-color: #f9fafb; padding: 20px; border-radius: 4px; border-left: 3px solid #e5e7eb;">
                <p style="margin: 0; color: #374151; font-style: italic; line-height: 1.6;">
                  "${data.reviewText}"
                </p>
              </div>

              <!-- Feedback Message -->
              ${
                data.rating >= 4
                  ? `
              <div style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #065f46;">
                  <strong>🎉 Great job!</strong> Positive reviews like this help build trust with new customers and improve your seller rating.
                </p>
              </div>
              `
                  : data.rating >= 3
                  ? `
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;">
                  <strong>💡 Tip:</strong> Consider reaching out to the customer to understand their concerns and improve their experience.
                </p>
              </div>
              `
                  : `
              <div style="background-color: #fee2e2; border: 1px solid #ef4444; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b;">
                  <strong>⚠️ Action Needed:</strong> This low rating may impact your seller score. We recommend contacting the customer to resolve any issues.
                </p>
              </div>
              `
              }

              ${
                data.dashboardUrl
                  ? `
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      View All Reviews
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                Customer reviews help you understand what's working well and where you can improve.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                This is an automated notification from ProtiMart
              </p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">
                © ${new Date().getFullYear()} ProtiMart. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
