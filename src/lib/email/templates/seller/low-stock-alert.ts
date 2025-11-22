/**
 * Email Template: Low Stock Alert (Seller)
 * Sent when product stock reaches threshold
 */

export interface LowStockAlertData {
  sellerName: string;
  productName: string;
  currentStock: number;
  threshold: number;
  sku?: string;
  productUrl?: string;
  dashboardUrl?: string;
}

export function generateLowStockAlertEmail(data: LowStockAlertData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Low Stock Alert</title>
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
                ⚠️ Low Stock Alert
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
                Your product inventory is running low and needs restocking soon.
              </p>

              <!-- Product Details Card -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px;">
                  ${data.productName}
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${
                    data.sku
                      ? `
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">SKU:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.sku}
                    </td>
                  </tr>
                  `
                      : ""
                  }
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Current Stock:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="font-size: 24px; font-weight: bold; color: #d97706;">${
                        data.currentStock
                      } units</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Threshold:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.threshold} units
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Alert Box -->
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;">
                  <strong>⚡ Action Required:</strong> Please restock this product to avoid going out of stock and losing potential sales.
                </p>
              </div>

              ${
                data.dashboardUrl || data.productUrl
                  ? `
              <!-- CTA Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    ${
                      data.dashboardUrl
                        ? `
                    <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 5px;">
                      Update Stock
                    </a>
                    `
                        : ""
                    }
                    ${
                      data.productUrl
                        ? `
                    <a href="${data.productUrl}" style="display: inline-block; background-color: #ffffff; color: #d97706; border: 2px solid #d97706; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 5px;">
                      View Product
                    </a>
                    `
                        : ""
                    }
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                Keeping your products in stock ensures consistent sales and customer satisfaction.
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
