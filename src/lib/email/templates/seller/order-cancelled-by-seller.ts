/**
 * Email Template: Order Cancelled by Seller (Seller Confirmation)
 * Sent when seller cancels an order
 */

export interface OrderCancelledBySellerData {
  sellerName: string;
  orderNumber: string;
  cancelledDate: string;
  orderAmount: number;
  cancellationReason: string;
  buyerName: string;
  items: Array<{
    productName: string;
    quantity: number;
  }>;
  refundAmount?: number;
  dashboardUrl?: string;
}

export function generateOrderCancelledBySellerEmail(
  data: OrderCancelledBySellerData
): string {
  const itemsHtml = data.items
    .map(
      (item) => `
    <li style="padding: 5px 0; color: #374151;">
      ${item.productName} (Qty: ${item.quantity})
    </li>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Cancellation Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ⚠️ Order Cancellation Confirmed
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
                This is a confirmation that you have successfully cancelled the following order.
              </p>

              <!-- Order Details Card -->
              <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 18px;">
                  Order #${data.orderNumber}
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Cancelled On:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.cancelledDate}
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
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Order Amount:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ₹${data.orderAmount.toFixed(2)}
                    </td>
                  </tr>
                  ${
                    data.refundAmount
                      ? `
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Refund Amount:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="font-weight: bold; color: #ef4444;">₹${data.refundAmount.toFixed(
                        2
                      )}</span>
                    </td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>

              <!-- Cancellation Reason -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                Cancellation Reason
              </h3>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 4px; color: #374151;">
                ${data.cancellationReason}
              </div>

              <!-- Cancelled Items -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                Cancelled Items
              </h3>
              <ul style="margin: 0; padding-left: 20px;">
                ${itemsHtml}
              </ul>

              <!-- Important Notice -->
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;">
                  <strong>📌 Important:</strong> The customer has been notified of this cancellation. ${
                    data.refundAmount
                      ? "A refund of ₹" +
                        data.refundAmount.toFixed(2) +
                        " will be processed to the customer within 5-7 business days."
                      : "No payment was collected for this order."
                  }
                </p>
              </div>

              ${
                data.dashboardUrl
                  ? `
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                If you have any questions, please contact our seller support team.
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
