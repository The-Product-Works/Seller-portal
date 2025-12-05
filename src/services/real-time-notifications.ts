// src/services/real-time-notifications.ts
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface NotificationConfig {
  enabled: boolean;
  sellerId: string;
  monitorOrders: boolean;
  monitorInventory: boolean;
  monitorReviews: boolean;
  monitorPayouts: boolean;
  monitorReturns: boolean;
  monitorAccount: boolean;
}

export class RealTimeNotificationService {
  private static instance: RealTimeNotificationService;
  private config: NotificationConfig | null = null;
  private subscriptions: { [key: string]: RealtimeChannel } = {};
  private isActive = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private processedEvents: Set<string> = new Set(); // Track processed events
  private lastEventTime: Map<string, number> = new Map(); // Track event timing

  private constructor() {}

  static getInstance(): RealTimeNotificationService {
    if (!RealTimeNotificationService.instance) {
      RealTimeNotificationService.instance = new RealTimeNotificationService();
    }
    return RealTimeNotificationService.instance;
  }

  async startMonitoring(config: NotificationConfig): Promise<void> {
    console.log('🚀 Starting real-time notification monitoring...', config);
    
    // Force configuration to be enabled and persistent
    this.config = {
      ...config,
      enabled: true  // Always enable - don't let it auto-disable
    };
    this.isActive = true;  // Force active state
    this.reconnectAttempts = 0;
    this.processedEvents.clear(); // Clear previous event tracking
    this.lastEventTime.clear();

    // Support monitoring for all sellers
    if (!this.config.sellerId || this.config.sellerId.trim() === '') {
      console.log('⚠️ No specific seller ID provided, will monitor all sellers');
      this.config.sellerId = 'ALL';
    }
    
    try {
      // Stop existing monitoring first
      await this.stopMonitoring();
      
      // Force active state again after stop
      this.isActive = true;
      
      // Start fresh monitoring
      await this.initializeMonitoring();
      
      // Start health check
      this.startHealthCheck();
      
      console.log('✅ Real-time notification monitoring started and LOCKED ACTIVE');
      console.log('📧 All notifications will be sent to: 22052204@kiit.ac.in');
    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
      // Don't disable on error - keep trying
      this.handleConnectionError();
      throw error;
    }
  }

  private async initializeMonitoring(): Promise<void> {
    if (!this.config) return;
    
    // Monitor orders
    if (this.config.monitorOrders) {
      await this.monitorOrders();
    }

    // Monitor inventory
    if (this.config.monitorInventory) {
      await this.monitorInventory();
    }

    // Monitor reviews
    if (this.config.monitorReviews) {
      await this.monitorReviews();
    }

    // Monitor payouts
    if (this.config.monitorPayouts) {
      await this.monitorPayouts();
    }

    // Monitor returns
    if (this.config.monitorReturns) {
      await this.monitorReturns();
    }

    // Monitor account changes
    if (this.config.monitorAccount) {
      await this.monitorAccountChanges();
    }
  }

  private startHealthCheck(): void {
    // Check connection health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 30000);
  }

  private async checkConnectionHealth(): Promise<void> {
    if (!this.isActive) return;
    
    try {
      // Test connection with a simple query
      const { error } = await supabase.from('sellers').select('id').limit(1);
      if (error) {
        console.warn('🔄 Connection health check failed, attempting reconnect...');
        this.handleConnectionError();
      }
    } catch (error) {
      console.warn('🔄 Connection health check failed:', error);
      this.handleConnectionError();
    }
  }

  private handleConnectionError(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Stopping monitoring.');
      this.isActive = false;
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff
    
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectInterval = setTimeout(async () => {
      try {
        await this.initializeMonitoring();
        this.reconnectAttempts = 0; // Reset on success
        console.log('✅ Reconnection successful');
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.handleConnectionError(); // Try again
      }
    }, delay);
  }

  async stopMonitoring(): Promise<void> {
    console.log('🛑 Stopping real-time notification monitoring...');
    
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    // Unsubscribe from all channels
    Object.values(this.subscriptions).forEach(subscription => {
      try {
        supabase.removeChannel(subscription);
      } catch (error) {
        console.warn('Warning removing channel:', error);
      }
    });
    
    this.subscriptions = {};
    // DON'T set isActive = false unless explicitly stopping
    // this.isActive = false;
    this.reconnectAttempts = 0;
    
    console.log('✅ Real-time notification monitoring stopped (but can restart)');
  }

  async stopMonitoringCompletely(): Promise<void> {
    console.log('🔴 Completely stopping real-time notification monitoring...');
    await this.stopMonitoring();
    this.isActive = false;
    this.config = null;
    console.log('✅ Real-time notification monitoring completely disabled');
  }

  // Add duplicate prevention helper
  private isDuplicateEvent(eventType: string, entityId: string, data: Record<string, unknown>): boolean {
    const eventKey = `${eventType}_${entityId}_${JSON.stringify(data)}`;
    const currentTime = Date.now();
    
    // Check if we've seen this exact event recently (within 30 seconds)
    const lastTime = this.lastEventTime.get(eventKey);
    if (lastTime && currentTime - lastTime < 30000) {
      console.log(`🔄 Skipping duplicate event: ${eventKey}`);
      return true;
    }
    
    // Track this event
    this.lastEventTime.set(eventKey, currentTime);
    
    // Clean up old entries (older than 5 minutes)
    for (const [key, time] of this.lastEventTime.entries()) {
      if (currentTime - time > 300000) {
        this.lastEventTime.delete(key);
      }
    }
    
    return false;
  }

  private async monitorOrders(): Promise<void> {
    console.log('👀 Monitoring orders for real-time notifications...');
    
    // Monitor new order items (since order_items table has seller_id)
    // Support monitoring all sellers or specific seller
    const filter = this.config!.sellerId === 'ALL' 
      ? undefined  // No filter = monitor all
      : `seller_id=eq.${this.config!.sellerId}`;
    
    const orderItemsChannel = supabase
      .channel('order-items-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'order_items',
          ...(filter && { filter })
        },
        async (payload) => {
          if (!this.isActive) return;
          
          console.log('🎉 New order item detected:', payload.new);
          const orderItem = payload.new as {
            order_id: string;
            seller_id: string;
            quantity: number;
            price_per_unit: number;
            [key: string]: unknown;
          };
          
          // Skip if specific seller monitoring and this isn't their order
          if (this.config!.sellerId !== 'ALL' && orderItem.seller_id !== this.config!.sellerId) {
            return;
          }
          
          try {
            // Get order details and seller info
            const { data: order } = await supabase
              .from('orders')
              .select(`
                *,
                users!inner(email, first_name, last_name)
              `)
              .eq('order_id', orderItem.order_id)
              .single();

            // Get seller details
            const { data: seller } = await supabase
              .from('sellers')
              .select('business_email, business_name')
              .eq('seller_id', orderItem.seller_id)
              .single();

            // Get product details
            const { data: listing } = await supabase
              .from('listings')
              .select('title, category')
              .eq('listing_id', orderItem.listing_id)
              .single();
            
            const orderNumber = `ORD-${orderItem.order_id.slice(0, 8)}`;
            const totalAmount = (orderItem.quantity || 1) * (orderItem.price_per_unit || 0);
            
            if (seller?.business_email && order?.users?.email) {
              // Import email service
              const { sendNewOrderReceivedEmail } = await import('@/lib/email/helpers/new-order-received');
              const { sendOrderConfirmedEmail } = await import('@/lib/email/helpers/order-confirmed');
              
              // Send new order notification to seller
              const sellerEmailResult = await sendNewOrderReceivedEmail({
                sellerName: seller.business_name || 'Seller',
                sellerEmail: seller.business_email,
                customerName: `${order.users.first_name} ${order.users.last_name}`,
                customerEmail: order.users.email,
                orderNumber,
                orderDate: new Date().toISOString(),
                totalAmount,
                items: [{
                  productName: listing?.title || 'Product',
                  quantity: orderItem.quantity || 1,
                  price: orderItem.price_per_unit || 0
                }],
                shippingAddress: order.shipping_address || {},
                paymentMethod: order.payment_method || 'Card'
              });

              // Send order confirmation to buyer
              const buyerEmailResult = await sendOrderConfirmedEmail({
                buyerEmail: order.users.email,
                buyerName: `${order.users.first_name} ${order.users.last_name}`,
                orderNumber,
                orderDate: new Date().toISOString(),
                totalAmount,
                items: [{
                  productName: listing?.title || 'Product',
                  quantity: orderItem.quantity || 1,
                  price: orderItem.price_per_unit || 0
                }],
                shippingAddress: order.shipping_address || {},
                paymentMethod: order.payment_method || 'Card',
                estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              });
              
              console.log('📧 Email notifications sent:', {
                seller: sellerEmailResult.success ? '✅' : '❌',
                buyer: buyerEmailResult.success ? '✅' : '❌',
                orderNumber
              });
            } else {
              console.log('⚠️ Missing email addresses - notifications not sent');
            }
          } catch (error) {
            console.error('❌ Failed to send new order notifications:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_items',
          ...(filter && { filter })
        },
        async (payload) => {
          if (!this.isActive) return;
          
          const oldOrderItem = payload.old as { status: string; [key: string]: unknown };
          const newOrderItem = payload.new as {
            order_id: string;
            seller_id: string;
            status: string;
            listing_id: string;
            [key: string]: unknown;
          };
          
          // Skip if specific seller monitoring and this isn't their order
          if (this.config!.sellerId !== 'ALL' && newOrderItem.seller_id !== this.config!.sellerId) {
            return;
          }
          
          // Handle various order status changes
          const statusChanged = oldOrderItem.status !== newOrderItem.status;
          
          if (statusChanged) {
            console.log(`📦 Order status change: ${oldOrderItem.status} → ${newOrderItem.status}`);
            
            try {
              // Get comprehensive order details
              const { data: orderDetails } = await supabase
                .from('orders')
                .select(`
                  *,
                  users!inner(email, first_name, last_name)
                `)
                .eq('order_id', newOrderItem.order_id)
                .single();

              // Get seller details
              const { data: seller } = await supabase
                .from('sellers')
                .select('business_email, business_name')
                .eq('seller_id', newOrderItem.seller_id)
                .single();

              // Get product details
              const { data: listing } = await supabase
                .from('seller_product_listings')
                .select('seller_title, category')
                .eq('listing_id', newOrderItem.listing_id)
                .single();
              
              const orderNumber = `ORD-${newOrderItem.order_id.slice(0, 8)}`;
              const productName = listing?.seller_title || 'Product';
              
              // Handle order cancellation
              if (oldOrderItem.status !== 'cancelled' && newOrderItem.status === 'cancelled') {
                console.log('❌ Order cancellation detected');
                
                if (seller?.business_email && orderDetails?.users?.email) {
                  const { sendOrderCancelledSellerEmail } = await import('@/lib/email/helpers/order-cancelled-seller');
                  const { sendOrderCancelledBuyerEmail } = await import('@/lib/email/helpers/order-cancelled-buyer');
                  
                  // Notify seller of cancellation
                  const sellerCancelResult = await sendOrderCancelledSellerEmail({
                    sellerName: seller.business_name || 'Seller',
                    sellerEmail: seller.business_email,
                    customerName: `${orderDetails.users.first_name} ${orderDetails.users.last_name}`,
                    orderNumber,
                    productName,
                    cancelledAt: new Date().toISOString(),
                    reason: 'Customer requested cancellation'
                  });

                  // Notify buyer of cancellation confirmation
                  const buyerCancelResult = await sendOrderCancelledBuyerEmail({
                    buyerName: `${orderDetails.users.first_name} ${orderDetails.users.last_name}`,
                    buyerEmail: orderDetails.users.email,
                    orderNumber,
                    productName,
                    refundAmount: newOrderItem.price_per_unit * newOrderItem.quantity,
                    cancelledAt: new Date().toISOString(),
                    refundProcessingDays: 3
                  });
                  
                  console.log('📧 Cancellation emails sent:', {
                    seller: sellerCancelResult.success ? '✅' : '❌',
                    buyer: buyerCancelResult.success ? '✅' : '❌'
                  });
                }
              }
              
              // Handle order packed status
              else if (oldOrderItem.status !== 'packed' && newOrderItem.status === 'packed') {
                console.log('📦 Order packed - sending notification');
                
                if (orderDetails?.users?.email) {
                  const { sendOrderPackedEmail } = await import('@/lib/email/helpers/order-packed');
                  
                  const packedResult = await sendOrderPackedEmail({
                    buyerName: `${orderDetails.users.first_name} ${orderDetails.users.last_name}`,
                    buyerEmail: orderDetails.users.email,
                    sellerName: seller?.business_name || 'Seller',
                    orderNumber,
                    productName,
                    packedAt: new Date().toISOString(),
                    estimatedShipping: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                    trackingAvailable: false
                  });
                  
                  console.log('📧 Order packed email:', packedResult.success ? '✅' : '❌');
                }
              }
              
              // Handle return initiated status
              else if (oldOrderItem.status !== 'return_requested' && newOrderItem.status === 'return_requested') {
                console.log('🔄 Return initiated - sending notification');
                
                if (seller?.business_email) {
                  const { sendReturnInitiatedEmail } = await import('@/lib/email/helpers/return-initiated');
                  
                  const returnResult = await sendReturnInitiatedEmail({
                    sellerName: seller.business_name || 'Seller',
                    sellerEmail: seller.business_email,
                    customerName: `${orderDetails?.users?.first_name} ${orderDetails?.users?.last_name}`,
                    orderNumber,
                    productName,
                    returnReason: 'Customer requested return',
                    returnInitiatedAt: new Date().toISOString()
                  });
                  
                  console.log('📧 Return initiated email:', returnResult.success ? '✅' : '❌');
                }
              }
              
            } catch (error) {
              console.error('❌ Failed to send order status change notifications:', error);
            }
          }
        }
      )
      .subscribe();

    this.subscriptions['order-items'] = orderItemsChannel;
  }

  private async monitorInventory(): Promise<void> {
    console.log('📦 Monitoring inventory for real-time notifications...');
    
    // Monitor seller_product_listings for stock changes
    // Support monitoring all sellers or specific seller
    const filter = this.config!.sellerId === 'ALL' 
      ? undefined  // No filter = monitor all
      : `seller_id=eq.${this.config!.sellerId}`;
    
    const inventoryChannel = supabase
      .channel('inventory-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seller_product_listings',
          ...(filter && { filter })
        },
        async (payload) => {
          if (!this.isActive) return;
          
          const oldListing = payload.old as { total_stock_quantity: number; [key: string]: unknown };
          const newListing = payload.new as {
            id: string;
            seller_id: string;
            total_stock_quantity: number;
            title?: string;
            [key: string]: unknown;
          };
          
          // Skip if specific seller monitoring and this isn't their product
          if (this.config!.sellerId !== 'ALL' && newListing.seller_id !== this.config!.sellerId) {
            return;
          }
          
          // Check for duplicate events
          const stockChangeKey = `stock_${newListing.id}_${newListing.total_stock_quantity}`;
          if (this.isDuplicateEvent('inventory_change', newListing.id, { stock: newListing.total_stock_quantity })) {
            return;
          }
          
          console.log('📊 Inventory change detected:', { 
            product: newListing.seller_title,
            oldStock: oldListing.total_stock_quantity,
            newStock: newListing.total_stock_quantity 
          });
          
          try {
            const productName = newListing.seller_title || 'Product';
            const oldStock = oldListing.total_stock_quantity || 0;
            const newStock = newListing.total_stock_quantity || 0;
            
            // Check for out of stock
            if (oldStock > 0 && newStock <= 0) {
              console.log('📧 Out of stock notification would be sent...', {
                sellerId: newListing.seller_id,
                productName
              });
              
              // Email notifications removed - logging event only
              console.log('ℹ️ Out of stock notification logged (email disabled)');
            }
            // Check for low stock
            else if (
              oldStock >= 10 && 
              newStock > 0 && 
              newStock < 10
            ) {
              console.log('📧 Low stock notification would be sent...', {
                sellerId: newListing.seller_id,
                productName,
                currentStock: newStock
              });
              
              // Email notifications removed - logging event only
              console.log('ℹ️ Low stock notification logged (email disabled)');
            }
          } catch (error) {
            console.error('❌ Failed to log inventory event:', error);
          }
        }
      )
      .subscribe();

    this.subscriptions['inventory'] = inventoryChannel;
  }

  private async monitorReviews(): Promise<void> {
    console.log('⭐ Monitoring reviews for real-time notifications...');
    
    // For now, disable reviews monitoring as the table relationships are complex
    // This can be re-enabled when the proper product-seller relationship is clarified
    console.log('🚧 Reviews monitoring temporarily disabled - needs product-seller relationship clarification');
    
    // Placeholder for future implementation when product schema is clarified
    const reviewsChannel = supabase
      .channel('reviews-realtime-placeholder')
      .subscribe();

    this.subscriptions['reviews'] = reviewsChannel;
  }

  private async monitorPayouts(): Promise<void> {
    console.log('💰 Monitoring payouts for real-time notifications...');
    
    // Monitor seller bank accounts table for payouts (since seller_payouts might not exist)
    const payoutsChannel = supabase
      .channel('payouts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seller_bank_accounts',
          filter: `seller_id=eq.${this.config!.sellerId}`
        },
        async (payload) => {
          if (!this.isActive) return;
          
          const oldAccount = payload.old as { account_verified?: boolean; account_number?: string; [key: string]: unknown };
          const newAccount = payload.new as { id: string; account_verified?: boolean; account_number?: string; bank_name?: string; [key: string]: unknown };
          
          // Check if account was verified (simulating payout event)
          if (!oldAccount.account_verified && newAccount.account_verified) {
            console.log('💸 Bank account verified (payout ready):', newAccount);
            
            try {
              const maskedAccount = newAccount.account_number ? 
                `**** **** ${newAccount.account_number.slice(-4)}` : '**** **** ****';
              
              console.log('📧 Sending payout notification...', {
                sellerId: newAccount.seller_id,
                amount: 1250.75
              });
              
              await sendPayoutNotification({
                sellerId: newAccount.seller_id,
                amount: 1250.75, // Demo amount
                transactionId: `TXN-${newAccount.id.slice(0, 8)}`
              });
              console.log('✅ Payout notification sent');
            } catch (error) {
              console.error('❌ Failed to send payout notification:', error);
            }
          }
        }
      )
      .subscribe();

    this.subscriptions['payouts'] = payoutsChannel;
  }

  private async monitorReturns(): Promise<void> {
    console.log('🔄 Monitoring returns for real-time notifications...');
    
    // Monitor order_returns table directly for this seller
    const returnsChannel = supabase
      .channel('returns-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_returns',
          filter: `seller_id=eq.${this.config!.sellerId}`
        },
        async (payload) => {
          if (!this.isActive) return;
          
          const returnRequest = payload.new as { order_id?: string; seller_id: string; reason?: string; [key: string]: unknown };
          console.log('🔄 New return request detected:', returnRequest);
          
          try {
            const orderNumber = `ORD-${returnRequest.order_id?.slice(0, 8) || 'UNKNOWN'}`;
            
            console.log('📧 Sending return request notification...', {
              sellerId: returnRequest.seller_id,
              orderNumber
            });
            
            await sendReturnRequestNotification({
              sellerId: returnRequest.seller_id,
              orderId: returnRequest.order_id || 'unknown',
              orderNumber: orderNumber,
              productName: 'Product', // Simplified
              reason: returnRequest.reason || 'Not specified'
            });
            console.log('✅ Return request notification sent');
          } catch (error) {
            console.error('❌ Failed to send return request notification:', error);
          }
        }
      )
      .subscribe();

    this.subscriptions['returns'] = returnsChannel;
  }

  private async monitorAccountChanges(): Promise<void> {
    console.log('👤 Monitoring account changes for real-time notifications...');
    
    const accountChannel = supabase
      .channel('account-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sellers',
          filter: `id=eq.${this.config!.sellerId}`
        },
        async (payload) => {
          if (!this.isActive) return;
          
          const oldSeller = payload.old as { verification_status: string; [key: string]: unknown };
          const newSeller = payload.new as {
            id: string;
            verification_status: string;
            [key: string]: unknown;
          };
          
          // Check if account was approved
          if (oldSeller.verification_status !== 'approved' && newSeller.verification_status === 'approved') {
            console.log('🎉 Account approval detected:', newSeller);
            
            try {
              const sellerEmail = newSeller.business_email || newSeller.email;
              const sellerName = newSeller.business_name || newSeller.name || 'Seller';
              
              if (sellerEmail) {
                const { sendAccountApprovedEmail } = await import('@/lib/email/helpers/account-approved');
                
                const approvalResult = await sendAccountApprovedEmail({
                  sellerId: newSeller.id,
                  sellerName,
                  sellerEmail,
                  approvalDate: new Date().toISOString()
                });
                
                console.log('📧 Account approval email:', approvalResult.success ? '✅' : '❌');
                
                // Also notify admin about new approved seller
                const { sendAdminKYCSubmittedEmail } = await import('@/lib/email/helpers/admin-kyc-submitted');
                
                const adminNotificationResult = await sendAdminKYCSubmittedEmail({
                  sellerId: newSeller.id,
                  sellerName,
                  sellerEmail,
                  adminId: 'admin',
                  adminName: 'Admin',
                  adminEmail: process.env.ADMIN_EMAIL || 'admin@protimart.com',
                  documentsSubmitted: ['Business License', 'ID Verification', 'Tax Information']
                });
                
                console.log('📧 Admin notification:', adminNotificationResult.success ? '✅' : '❌');
              } else {
                console.log('⚠️ No email address found for seller:', newSeller.id);
              }
            } catch (error) {
              console.error('❌ Failed to send account approval notification:', error);
            }
          }
        }
      )
      .subscribe();

    this.subscriptions['account'] = accountChannel;
  }

  // Utility methods
  isMonitoring(): boolean {
    return this.isActive;
  }

  getConfig(): NotificationConfig | null {
    return this.config;
  }

  getActiveSubscriptions(): string[] {
    return Object.keys(this.subscriptions);
  }
}

// Export singleton instance
export const realtimeNotificationService = RealTimeNotificationService.getInstance();