/**
 * Email Template: New Order Received (Seller)
 * Sent when seller receives a new order
 */

export interface NewOrderReceivedData {
  sellerName: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  itemCount: number;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
  buyerName: string;
  shippingAddress: string;
  orderId?: string; // Added for direct order link
  dashboardUrl?: string;
  orderDetailsUrl?: string; // Direct link to order details page
}

export function generateNewOrderReceivedEmail(
  data: NewOrderReceivedData
): string {
  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
        ${item.productName}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        ₹${item.price.toFixed(2)}
      </td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Received</title>
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
                🎉 New Order Received!
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
                Great news! You have received a new order.
              </p>

              <!-- Order Details Card -->
              <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Order Number:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="color: #10b981; font-weight: bold;">${
                        data.orderNumber
                      }</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Order Date:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.orderDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Total Amount:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="font-size: 20px; font-weight: bold; color: #10b981;">₹${data.totalAmount.toFixed(
                        2
                      )}</span>
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

              <!-- Items Table -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                Order Items (${data.itemCount})
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 4px;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280;">
                      Product
                    </th>
                    <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #e5e7eb; color: #6b7280;">
                      Qty
                    </th>
                    <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #6b7280;">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Shipping Address -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;">
                📦 Shipping Address
              </h3>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 4px; color: #374151;">
                ${data.shippingAddress.replace(/\n/g, "<br>")}
              </div>

              <!-- Action Required -->
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;">
                  <strong>⚡ Action Required:</strong> Please prepare this order for shipping as soon as possible.
                </p>
              </div>

              <!-- CTA Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    ${
                      data.orderDetailsUrl
                        ? `
                    <a href="${data.orderDetailsUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; margin-right: 10px;">
                      📦 View Order Details
                    </a>
                        `
                        : ""
                    }
                    ${
                      data.dashboardUrl
                        ? `
                    <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      🏠 Go to Dashboard
                    </a>
                        `
                        : ""
                    }
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                Thank you for being a valued seller on ProtiMart!
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
