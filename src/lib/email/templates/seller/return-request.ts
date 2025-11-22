/**
 * Email Template: Return Request Received (Seller)
 * Sent when buyer initiates a return request
 */

export interface ReturnRequestData {
  sellerName: string;
  orderNumber: string;
  returnRequestDate: string;
  returnReason: string;
  productName: string;
  quantity: number;
  orderAmount: number;
  buyerName: string;
  buyerComments?: string;
  videoUrl?: string;
  dashboardUrl?: string;
}

export function generateReturnRequestEmail(data: ReturnRequestData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Return Request Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🔄 Return Request Received
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
                A buyer has initiated a return request for their order.
              </p>

              <!-- Return Details Card -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Order Number:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="color: #d97706; font-weight: bold;">${
                        data.orderNumber
                      }</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Request Date:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.returnRequestDate}
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
                      <strong style="color: #6b7280;">Quantity:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.quantity}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Amount:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ₹${data.orderAmount.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Buyer:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.buyerName}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Return Reason -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                Return Reason
              </h3>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 4px; color: #374151;">
                <strong>${data.returnReason}</strong>
                ${
                  data.buyerComments
                    ? `<p style="margin: 10px 0 0 0;">${data.buyerComments}</p>`
                    : ""
                }
              </div>

              ${
                data.videoUrl
                  ? `
              <!-- Video Evidence -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                📹 Video Evidence
              </h3>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 4px;">
                <a href="${data.videoUrl}" style="color: #3b82f6; text-decoration: none;">
                  View Return Video →
                </a>
              </div>
              `
                  : ""
              }

              <!-- Action Required -->
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;">
                  <strong>⚡ Action Required:</strong> Please review this return request and approve or reject it within 2 business days. Once the return is received by you, the refund will be initiated automatically.
                </p>
              </div>

              ${
                data.dashboardUrl
                  ? `
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Review Return Request
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                Please respond promptly to maintain good customer service.
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
