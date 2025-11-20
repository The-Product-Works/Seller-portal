/**
 * Email templates for seller notifications
 */

interface OrderDetails {
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  itemCount: number;
  customerName?: string;
}

interface ProductDetails {
  productName: string;
  currentStock: number;
  threshold: number;
}

interface PayoutDetails {
  amount: number;
  payoutDate: string;
  transactionId: string;
}

interface ReturnDetails {
  orderNumber: string;
  returnReason: string;
  customerName?: string;
  videoUrl?: string;
}

export function getNewOrderEmailTemplate(details: OrderDetails): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; }
          .order-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
          .button { background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Order Received!</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Great news! You have received a new order.</p>
            <div class="order-details">
              <h3>Order Details:</h3>
              <p><strong>Order Number:</strong> ${details.orderNumber}</p>
              <p><strong>Order Date:</strong> ${details.orderDate}</p>
              <p><strong>Total Amount:</strong> ₹${details.totalAmount.toFixed(2)}</p>
              <p><strong>Items:</strong> ${details.itemCount}</p>
              ${details.customerName ? `<p><strong>Customer:</strong> ${details.customerName}</p>` : ''}
            </div>
            <p>Please log in to your seller portal to view full order details and process this order.</p>
            <a href="#" class="button">View Order Details</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from your Seller Portal.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getReturnRequestEmailTemplate(details: ReturnDetails): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; }
          .return-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #FF9800; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
          .button { background-color: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Return Request Received</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>A customer has requested to return an order.</p>
            <div class="return-details">
              <h3>Return Details:</h3>
              <p><strong>Order Number:</strong> ${details.orderNumber}</p>
              <p><strong>Return Reason:</strong> ${details.returnReason}</p>
              ${details.customerName ? `<p><strong>Customer:</strong> ${details.customerName}</p>` : ''}
              ${details.videoUrl ? `<p><strong>Video Evidence:</strong> <a href="${details.videoUrl}">View Video</a></p>` : ''}
            </div>
            <p>Please review the return request and take appropriate action.</p>
            <a href="#" class="button">Review Return Request</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from your Seller Portal.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getLowStockAlertTemplate(details: ProductDetails): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FFC107; color: #333; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; }
          .alert-box { background-color: #FFF3CD; padding: 15px; margin: 15px 0; border-left: 4px solid #FFC107; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
          .button { background-color: #FFC107; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Low Stock Alert</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your product inventory is running low.</p>
            <div class="alert-box">
              <h3>Product Details:</h3>
              <p><strong>Product:</strong> ${details.productName}</p>
              <p><strong>Current Stock:</strong> ${details.currentStock} units</p>
              <p><strong>Threshold:</strong> ${details.threshold} units</p>
            </div>
            <p>Please restock this product soon to avoid running out of inventory.</p>
            <a href="#" class="button">Manage Inventory</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from your Seller Portal.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getOutOfStockAlertTemplate(details: ProductDetails): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #F44336; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; }
          .alert-box { background-color: #FFEBEE; padding: 15px; margin: 15px 0; border-left: 4px solid #F44336; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
          .button { background-color: #F44336; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚫 Product Out of Stock!</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p><strong>Urgent:</strong> Your product is now out of stock.</p>
            <div class="alert-box">
              <h3>Product Details:</h3>
              <p><strong>Product:</strong> ${details.productName}</p>
              <p><strong>Current Stock:</strong> 0 units</p>
            </div>
            <p>Your product is no longer available for purchase. Please restock immediately to resume sales.</p>
            <a href="#" class="button">Restock Now</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from your Seller Portal.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getPayoutProcessedTemplate(details: PayoutDetails): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; }
          .payout-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2196F3; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
          .button { background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
          .amount { font-size: 24px; color: #2196F3; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Payout Processed!</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Great news! Your earnings have been successfully transferred.</p>
            <div class="payout-details">
              <h3>Payout Details:</h3>
              <p class="amount">₹${details.amount.toFixed(2)}</p>
              <p><strong>Payout Date:</strong> ${details.payoutDate}</p>
              <p><strong>Transaction ID:</strong> ${details.transactionId}</p>
            </div>
            <p>The amount should reflect in your registered bank account within 1-3 business days.</p>
            <a href="#" class="button">View Earnings</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from your Seller Portal.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
