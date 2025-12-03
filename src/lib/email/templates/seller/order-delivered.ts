/**
 * Email Template: Order Delivered (Seller)
 * Sent when buyer's order is successfully delivered
 */

export interface OrderDeliveredData {
  sellerName: string;
  orderNumber: string;
  deliveredDate: string;
  buyerName: string;
  totalAmount: number;
  items: Array<{
    productName: string;
    quantity: number;
  }>;
  deliveryAddress: string;
  trackingId?: string;
  dashboardUrl?: string;
}

export function generateOrderDeliveredEmail(data: OrderDeliveredData): string {
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
  <title>Order Delivered</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ✅ Order Delivered Successfully!
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
                Great news! Your order has been successfully delivered to the customer.
              </p>

              <!-- Order Details Card -->
              <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px;">
                  Order #${data.orderNumber}
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Delivered On:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.deliveredDate}
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
                      <strong style="color: #6b7280;">Order Value:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="font-size: 18px; font-weight: bold; color: #10b981;">₹${data.totalAmount.toFixed(
                        2
                      )}</span>
                    </td>
                  </tr>
                  ${
                    data.trackingId
                      ? `
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Tracking ID:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.trackingId}
                    </td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>

              <!-- Items List -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                Delivered Items
              </h3>
              <ul style="margin: 0; padding-left: 20px;">
                ${itemsHtml}
              </ul>

              <!-- Delivery Address -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                📍 Delivery Address
              </h3>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 4px; color: #374151;">
                ${data.deliveryAddress.replace(/\n/g, "<br>")}
              </div>

              <!-- Success Box -->
              <div style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #065f46;">
                  <strong>🎉 Payment Settlement:</strong> Your earnings for this order will be processed according to your payout schedule.
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
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                Thank you for providing excellent service to our customers!
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
