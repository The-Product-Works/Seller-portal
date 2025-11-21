import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "./email-service";
import {
  getLowStockAlertTemplate,
  getOutOfStockAlertTemplate,
  getPayoutProcessedTemplate,
  getNewOrderEmailTemplate,
  getReturnRequestEmailTemplate,
} from "./email-templates";
import { format } from "date-fns";

/**
 * Send low stock alert to seller
 */
export async function sendLowStockAlert(params: {
  sellerId: string;
  productName: string;
  currentStock: number;
  productId: string;
}) {
  const { data: seller } = await supabase
    .from("sellers")
    .select("email")
    .eq("id", params.sellerId)
    .single();

  if (!seller?.email) return { success: false, error: "Seller email not found" };

  const htmlContent = getLowStockAlertTemplate({
    productName: params.productName,
    currentStock: params.currentStock,
    threshold: 10,
  });

  return await sendEmail({
    recipientEmail: seller.email,
    recipientId: params.sellerId,
    recipientType: "seller",
    alertType: "low_stock_alert",
    subject: `⚠️ Low Stock Alert - ${params.productName}`,
    htmlContent,
    relatedProductId: params.productId,
    relatedSellerId: params.sellerId,
  });
}

/**
 * Send out of stock alert to seller
 */
export async function sendOutOfStockAlert(params: {
  sellerId: string;
  productName: string;
  productId: string;
}) {
  const { data: seller } = await supabase
    .from("sellers")
    .select("email")
    .eq("id", params.sellerId)
    .single();

  if (!seller?.email) return { success: false, error: "Seller email not found" };

  const htmlContent = getOutOfStockAlertTemplate({
    productName: params.productName,
    currentStock: 0,
    threshold: 10,
  });

  return await sendEmail({
    recipientEmail: seller.email,
    recipientId: params.sellerId,
    recipientType: "seller",
    alertType: "product_out_of_stock",
    subject: `🚨 Out of Stock - ${params.productName}`,
    htmlContent,
    relatedProductId: params.productId,
    relatedSellerId: params.sellerId,
  });
}

/**
 * Send payout processed notification to seller
 */
export async function sendPayoutNotification(params: {
  sellerId: string;
  amount: number;
  transactionId: string;
}) {
  const { data: seller } = await supabase
    .from("sellers")
    .select("email")
    .eq("id", params.sellerId)
    .single();

  if (!seller?.email) return { success: false, error: "Seller email not found" };

  const htmlContent = getPayoutProcessedTemplate({
    amount: params.amount,
    payoutDate: format(new Date(), "PPP"),
    transactionId: params.transactionId,
  });

  return await sendEmail({
    recipientEmail: seller.email,
    recipientId: params.sellerId,
    recipientType: "seller",
    alertType: "payout_processed",
    subject: `💰 Payout Processed - ₹${params.amount.toFixed(2)}`,
    htmlContent,
    relatedSellerId: params.sellerId,
    transactionId: params.transactionId,
  });
}

/**
 * Send new order notification to seller
 */
export async function sendNewOrderNotification(params: {
  sellerId: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  amount: number;
}) {
  const { data: seller } = await supabase
    .from("sellers")
    .select("email")
    .eq("id", params.sellerId)
    .single();

  if (!seller?.email) return { success: false, error: "Seller email not found" };

  const htmlContent = getNewOrderEmailTemplate({
    orderNumber: params.orderNumber,
    orderDate: format(new Date(), "PPP"),
    totalAmount: params.amount,
    itemCount: params.quantity,
  });

  return await sendEmail({
    recipientEmail: seller.email,
    recipientId: params.sellerId,
    recipientType: "seller",
    alertType: "new_order_received",
    subject: `🎉 New Order Received - #${params.orderNumber}`,
    htmlContent,
    relatedOrderId: params.orderId,
    relatedSellerId: params.sellerId,
  });
}

/**
 * Send return request notification to seller
 */
export async function sendReturnRequestNotification(params: {
  sellerId: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  reason: string;
}) {
  const { data: seller } = await supabase
    .from("sellers")
    .select("email")
    .eq("id", params.sellerId)
    .single();

  if (!seller?.email) return { success: false, error: "Seller email not found" };

  const htmlContent = getReturnRequestEmailTemplate({
    orderNumber: params.orderNumber,
    returnReason: params.reason,
  });

  return await sendEmail({
    recipientEmail: seller.email,
    recipientId: params.sellerId,
    recipientType: "seller",
    alertType: "return_request_received",
    subject: `🔄 Return Request - Order #${params.orderNumber}`,
    htmlContent,
    relatedOrderId: params.orderId,
    relatedSellerId: params.sellerId,
  });
}
