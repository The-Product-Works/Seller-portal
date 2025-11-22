// test-realtime-events.js - Simulate database events to trigger notifications
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (use your project details)
const supabaseUrl = 'https://sjjrrpyqadzzwljrdrwl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqanJycHlxYWR6endsamJkcndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4Mjg3NDEsImV4cCI6MjA0NjQwNDc0MX0.7zlrVtJlQk6KAI1jtHLKCOk-rNNf35RfBrFxD8OsGWE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestEvents() {
  console.log('🧪 Creating test database events to trigger real-time notifications...');
  
  try {
    // Test 1: Create a new order item to trigger order notification
    console.log('📝 Test 1: Creating new order item...');
    
    const testOrderItem = {
      order_id: crypto.randomUUID(),
      seller_id: 'test-seller-' + Date.now(),
      listing_id: 'test-listing-123',
      quantity: 2,
      price_per_unit: 149.99,
      status: 'confirmed',
      created_at: new Date().toISOString()
    };
    
    const { data: orderResult, error: orderError } = await supabase
      .from('order_items')
      .insert([testOrderItem])
      .select();
      
    if (orderError) {
      console.error('❌ Failed to create test order:', orderError);
    } else {
      console.log('✅ Test order created:', orderResult);
    }

    // Test 2: Update product stock to trigger inventory notification
    console.log('📝 Test 2: Finding and updating product stock...');
    
    // First, let's see if there are any existing products
    const { data: products, error: productsError } = await supabase
      .from('seller_product_listings')
      .select('id, seller_id, total_stock_quantity, title')
      .limit(5);
      
    if (productsError) {
      console.error('❌ Failed to fetch products:', productsError);
    } else {
      console.log('📊 Found products:', products?.length || 0);
      
      if (products && products.length > 0) {
        const productToUpdate = products[0];
        console.log('📦 Updating product stock for:', productToUpdate.title);
        
        const { data: stockResult, error: stockError } = await supabase
          .from('seller_product_listings')
          .update({ 
            total_stock_quantity: 8  // This should trigger low stock alert (≤10)
          })
          .eq('id', productToUpdate.id)
          .select();
          
        if (stockError) {
          console.error('❌ Failed to update stock:', stockError);
        } else {
          console.log('✅ Stock updated:', stockResult);
        }
      }
    }

    // Test 3: Update bundle stock
    console.log('📝 Test 3: Finding and updating bundle stock...');
    
    const { data: bundles, error: bundlesError } = await supabase
      .from('bundles')
      .select('id, seller_id, stock_quantity, title')
      .limit(5);
      
    if (bundlesError) {
      console.error('❌ Failed to fetch bundles:', bundlesError);
    } else {
      console.log('📊 Found bundles:', bundles?.length || 0);
      
      if (bundles && bundles.length > 0) {
        const bundleToUpdate = bundles[0];
        console.log('📦 Updating bundle stock for:', bundleToUpdate.title);
        
        const { data: bundleResult, error: bundleError } = await supabase
          .from('bundles')
          .update({ 
            stock_quantity: 3  // This should trigger low stock alert (≤5)
          })
          .eq('id', bundleToUpdate.id)
          .select();
          
        if (bundleError) {
          console.error('❌ Failed to update bundle stock:', bundleError);
        } else {
          console.log('✅ Bundle stock updated:', bundleResult);
        }
      }
    }

    console.log('🎯 Test events created! Check your email and real-time monitoring logs.');
    console.log('📧 Email should be sent to: 22052204@kiit.ac.in');
    console.log('🔍 Check browser console for real-time event detection.');
    
  } catch (error) {
    console.error('❌ Error creating test events:', error);
  }
}

// Run the test
createTestEvents();