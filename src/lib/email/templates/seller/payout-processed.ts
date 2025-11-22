/**
 * Email Template: Payout Processed (Seller)
 * Sent when earnings transfer is completed
 */

export interface PayoutProcessedData {
  sellerName: string;
  payoutAmount: number;
  payoutDate: string;
  payoutId: string;
  bankAccountLast4: string;
  transferMethod: string; // e.g., "Bank Transfer", "UPI"
  processingFee?: number;
  netAmount: number;
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  dashboardUrl?: string;
}

export function generatePayoutProcessedEmail(
  data: PayoutProcessedData
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payout Processed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 10px;">💰</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
                Payout Processed!
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px;">
                Your earnings have been transferred
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
                Hello <strong>${data.sellerName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
                Great news! Your payout has been successfully processed and transferred to your bank account.
              </p>

              <!-- Payout Amount Card -->
              <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 25px; margin: 20px 0; border-radius: 4px; text-align: center;">
                <div style="color: #065f46; font-size: 16px; margin-bottom: 10px;">
                  Net Payout Amount
                </div>
                <div style="font-size: 48px; font-weight: bold; color: #059669;">
                  ₹${data.netAmount.toFixed(2)}
                </div>
              </div>

              <!-- Payout Details -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                Payout Details
              </h3>
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 4px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Payout ID:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="color: #059669; font-weight: bold;">${
                        data.payoutId
                      }</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Payment Date:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.payoutDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Transfer Method:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.transferMethod}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Bank Account:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      XXXX ${data.bankAccountLast4}
                    </td>
                  </tr>
                  <tr style="border-top: 1px solid #e5e7eb;">
                    <td style="padding: 12px 0 8px 0;">
                      <strong style="color: #6b7280;">Period:</strong>
                    </td>
                    <td style="padding: 12px 0 8px 0; text-align: right;">
                      ${data.periodStart} - ${data.periodEnd}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Total Orders:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.orderCount}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Breakdown -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                Amount Breakdown
              </h3>
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 4px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; color: #374151;">
                      Gross Earnings
                    </td>
                    <td style="padding: 8px 0; text-align: right; color: #374151;">
                      ₹${data.payoutAmount.toFixed(2)}
                    </td>
                  </tr>
                  ${
                    data.processingFee
                      ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">
                      Processing Fee
                    </td>
                    <td style="padding: 8px 0; text-align: right; color: #6b7280;">
                      - ₹${data.processingFee.toFixed(2)}
                    </td>
                  </tr>
                  `
                      : ""
                  }
                  <tr style="border-top: 2px solid #10b981;">
                    <td style="padding: 12px 0 0 0;">
                      <strong style="color: #111827; font-size: 18px;">Net Payout</strong>
                    </td>
                    <td style="padding: 12px 0 0 0; text-align: right;">
                      <strong style="color: #059669; font-size: 20px;">₹${data.netAmount.toFixed(
                        2
                      )}</strong>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Timing Info -->
              <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af;">
                  <strong>⏱️ Processing Time:</strong> Your payout should reflect in your bank account within 2-3 business days.
                </p>
              </div>

              ${
                data.dashboardUrl
                  ? `
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      View Earnings Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                Thank you for being a valued seller on ProtiMart! Keep up the great work.
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
