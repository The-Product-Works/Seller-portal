/**
 * Email Template: Refund Completed (Seller)
 * Sent when refund is processed successfully
 */

export interface RefundCompletedData {
  sellerName: string;
  orderNumber: string;
  refundDate: string;
  refundAmount: number;
  productName: string;
  quantity: number;
  buyerName: string;
  refundId: string;
}

export function generateRefundCompletedEmail(
  data: RefundCompletedData
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refund Completed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ✅ Refund Completed
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
                The refund for a returned order has been processed successfully.
              </p>

              <!-- Refund Details Card -->
              <div style="background-color: #ede9fe; border-left: 4px solid #6366f1; padding: 20px; margin: 20px 0; border-radius: 4px;">
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
                      <strong style="color: #6b7280;">Refund ID:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="color: #6366f1; font-weight: bold;">${
                        data.refundId
                      }</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Refund Date:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.refundDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Refund Amount:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="font-size: 20px; font-weight: bold; color: #6366f1;">₹${data.refundAmount.toFixed(
                        2
                      )}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Product:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.productName} (Qty: ${data.quantity})
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

              <!-- Info Box -->
              <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af;">
                  <strong>ℹ️ Balance Update:</strong> This refund amount has been deducted from your pending balance. Your updated balance is reflected in your earnings dashboard.
                </p>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                The buyer will receive the refund in their original payment method within 5-7 business days.
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
