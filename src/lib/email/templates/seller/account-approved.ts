/**
 * Email Template: Account Approved (Seller)
 * Sent after KYC verification and onboarding completion
 */

export interface AccountApprovedData {
  sellerName: string;
  businessName: string;
  approvalDate: string;
  sellerId: string;
  dashboardUrl?: string;
  inventoryUrl?: string;
  supportUrl?: string;
}

export function generateAccountApprovedEmail(
  data: AccountApprovedData
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 10px;">🎉</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
                Congratulations!
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px;">
                Your seller account has been approved
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
                We're thrilled to inform you that your seller account for <strong>${
                  data.businessName
                }</strong> has been successfully verified and approved! You can now start selling on ProtiMart.
              </p>

              <!-- Account Details Card -->
              <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Seller ID:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="color: #059669; font-weight: bold;">${
                        data.sellerId
                      }</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Business Name:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.businessName}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Approval Date:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${data.approvalDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong style="color: #6b7280;">Status:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="background-color: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Next Steps -->
              <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 20px;">
                🚀 Next Steps
              </h3>
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 4px;">
                <ol style="margin: 0; padding-left: 20px; color: #374151;">
                  <li style="margin-bottom: 10px; line-height: 1.6;">
                    <strong>Add Your Products:</strong> Upload your product catalog to start selling
                  </li>
                  <li style="margin-bottom: 10px; line-height: 1.6;">
                    <strong>Set Up Inventory:</strong> Manage your stock levels and pricing
                  </li>
                  <li style="margin-bottom: 10px; line-height: 1.6;">
                    <strong>Configure Shipping:</strong> Set up your shipping methods and rates
                  </li>
                  <li style="margin-bottom: 10px; line-height: 1.6;">
                    <strong>Start Selling:</strong> Your products will be visible to millions of buyers
                  </li>
                </ol>
              </div>

              <!-- CTA Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    ${
                      data.dashboardUrl
                        ? `
                    <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 5px;">
                      Go to Dashboard
                    </a>
                    `
                        : ""
                    }
                    ${
                      data.inventoryUrl
                        ? `
                    <a href="${data.inventoryUrl}" style="display: inline-block; background-color: #ffffff; color: #059669; border: 2px solid #059669; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 5px;">
                      Add Products
                    </a>
                    `
                        : ""
                    }
                  </td>
                </tr>
              </table>

              <!-- Support Info -->
              <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af;">
                  <strong>💡 Need Help?</strong> Our seller support team is here to assist you. ${
                    data.supportUrl
                      ? `<a href="${data.supportUrl}" style="color: #2563eb;">Contact Support</a>`
                      : "Contact us anytime for assistance."
                  }
                </p>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 16px; color: #374151;">
                Welcome to the ProtiMart seller community! We're excited to have you on board.
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
