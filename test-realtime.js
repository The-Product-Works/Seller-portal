// test-realtime-notifications.js
// Simple script to test real-time notifications by creating database events

import { supabase } from './src/integrations/supabase/client.js';

async function testRealTimeNotifications() {
  console.log('Testing Real-Time Notifications...');
  
  try {
    // Get the first seller for testing
    const { data: sellers, error: sellersError } = await supabase
      .from('sellers')
      .select('id, email')
      .limit(1);
    
    if (sellersError || !sellers?.length) {
      console.error('No sellers found for testing:', sellersError);
      return;
    }
    
    const sellerId = sellers[0].id;
    console.log('Using seller ID:', sellerId);
    
    // Test 1: Create a new order item (should trigger new order notification)
    console.log('Test 1: Creating new order item...');
    
    // First create an order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: '00000000-0000-0000-0000-000000000000', // dummy buyer
        total_amount: 299.99,
        shipping_cost: 29.99,
        final_amount: 329.98,
        payment_status: 'paid'
      })
      .select()
      .single();
    
    if (orderError) {
      console.error('Failed to create order:', orderError);
    } else {
      console.log('Order created:', order.order_id);
      
      // Now create order item (this should trigger notification)
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.order_id,
          listing_id: '00000000-0000-0000-0000-000000000000', // dummy listing
          seller_id: sellerId,
          quantity: 2,
          price_per_unit: 149.99,
          subtotal: 299.98,
          status: 'confirmed'
        })
        .select()
        .single();
      
      if (itemError) {
        console.error('Failed to create order item:', itemError);
      } else {
        console.log('Order item created - should trigger NEW ORDER notification!');
      }
    }
    
    // Test 2: Update inventory (should trigger low stock alert)
    console.log('Test 2: Creating/updating product listing for low stock...');
    
    const { data: listing, error: listingError } = await supabase
      .from('seller_product_listings')
      .insert({
        global_product_id: '00000000-0000-0000-0000-000000000000',
        seller_id: sellerId,
        seller_title: 'Test Product for Notifications',
        base_price: 99.99,
        total_stock_quantity: 15, // Start with high stock
        status: 'active'
      })
      .select()
      .single();
    
    if (listingError) {
      console.log('Listing might already exist, trying to update existing one...');
      
      // Try to update existing listing
      const { data: existingListings } = await supabase
        .from('seller_product_listings')
        .select('*')
        .eq('seller_id', sellerId)
        .limit(1);
      
      if (existingListings?.length) {
        const { error: updateError } = await supabase
          .from('seller_product_listings')
          .update({
            total_stock_quantity: 5 // Low stock - should trigger alert
          })
          .eq('listing_id', existingListings[0].listing_id);
        
        if (updateError) {
          console.error('Failed to update listing stock:', updateError);
        } else {
          console.log('Updated listing to low stock (5 units) - should trigger LOW STOCK notification!');
        }
      }
    } else {
      console.log('Created new listing, now updating to low stock...');
      
      // Update to low stock
      const { error: updateError } = await supabase
        .from('seller_product_listings')
        .update({
          total_stock_quantity: 5 // Low stock - should trigger alert
        })
        .eq('listing_id', listing.listing_id);
      
      if (updateError) {
        console.error('Failed to update listing stock:', updateError);
      } else {
        console.log('Updated listing to low stock (5 units) - should trigger LOW STOCK notification!');
      }
    }
    
    // Test 3: Update seller verification status (should trigger account approval)
    console.log('Test 3: Updating seller verification status...');
    
    const { error: sellerUpdateError } = await supabase
      .from('sellers')
      .update({
        verification_status: 'approved'
      })
      .eq('id', sellerId);
    
    if (sellerUpdateError) {
      console.error('Failed to update seller status:', sellerUpdateError);
    } else {
      console.log('Updated seller to approved status - should trigger ACCOUNT APPROVED notification!');
    }
    
    // Test 4: Update bank account verification (should trigger payout notification)
    console.log('Test 4: Updating bank account verification...');
    
    const { data: bankAccount, error: bankError } = await supabase
      .from('seller_bank_accounts')
      .upsert({
        seller_id: sellerId,
        account_holder_name: 'Test Account Holder',
        account_number: '1234567890',
        ifsc_code: 'TEST0001234',
        bank_name: 'Test Bank',
        account_verified: true // This should trigger payout notification
      })
      .select()
      .single();
    
    if (bankError) {
      console.error('Failed to update bank account:', bankError);
    } else {
      console.log('Bank account verified - should trigger PAYOUT notification!');
    }
    
    console.log('All tests completed! Check your email (22052204@kiit.ac.in) for notifications.');
    console.log('Expected notifications:');
    console.log('  1. New Order Received');
    console.log('  2. Low Stock Alert');
    console.log('  3. Account Approved');
    console.log('  4. Payout Ready');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testRealTimeNotifications();