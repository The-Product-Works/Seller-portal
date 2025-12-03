/**
 * Email Template: Return Received by Seller
 * Sent when return package is received by seller
 */

export interface ReturnReceivedData {
  sellerName: string;
  orderNumber: string;
  returnId: string;
  receivedDate: string;
  productName: string;
  quantity: number;
  returnReason: string;
  refundAmount: number;
  buyerName: string;
  dashboardUrl?: string;
}

export function generateReturnReceivedEmail(data: ReturnReceivedData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Return Package Received</title>
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
                📦 Return Package Received
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
                The return package for the following order has been received and logged in the system.
              </p>

              <!-- Return Details Card -->
              <div style="background-color: #f3e8ff; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 15px 0; color: #5b21b6; font-size: 18px;">
                  Return #${data.returnId}
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Order Number:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.orderNumber}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Received On:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.receivedDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Customer:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.buyerName}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Product Details -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                Returned Product
              </h3>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 4px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color: #374151;">
                      <strong>${data.productName}</strong>
                    </td>
                    <td style="text-align: right; color: #6b7280;">
                      Qty: ${data.quantity}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Return Reason -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                Return Reason
              </h3>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 4px; color: #374151;">
                ${data.returnReason}
              </div>

              <!-- Refund Information -->
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #1e3a8a;">Refund Amount:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="font-size: 24px; font-weight: bold; color: #3b82f6;">₹${data.refundAmount.toFixed(
                        2
                      )}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Action Required -->
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;">
                  <strong>⚡ Next Steps:</strong> Please inspect the returned product and confirm its condition. The refund will be processed automatically after quality verification.
                </p>
              </div>

              ${
                data.dashboardUrl
                  ? `
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      View Return Details
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                Thank you for your cooperation in handling this return.
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
