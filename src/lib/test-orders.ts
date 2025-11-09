import { supabase } from "@/integrations/supabase/client";

// Test function to check database connectivity and data availability
export async function testOrdersAccess() {
  console.log("🧪 Testing orders access...");
  
  try {
    // First, test authentication
    const { data: auth, error: authError } = await supabase.auth.getUser();
    console.log("🔐 Auth result:", { user: auth?.user?.id, error: authError });
    
    if (!auth?.user) {
      console.log("❌ No authenticated user");
      return;
    }

    // Test seller lookup
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id, user_id")
      .eq("user_id", auth.user.id)
      .single();
    
    console.log("👤 Seller lookup:", { seller, error: sellerError });
    
    if (!seller) {
      console.log("❌ No seller found for user");
      return;
    }

    // Test direct orders query
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("order_id, status, created_at, seller_id")
      .eq("seller_id", seller.id)
      .limit(5);
    
    console.log("📦 Orders query result:", { orders, error: ordersError });

    // Test if any orders exist for any seller
    const { data: allOrders, error: allOrdersError } = await supabase
      .from("orders")
      .select("order_id, seller_id")
      .limit(5);
    
    console.log("📊 All orders sample:", { allOrders, error: allOrdersError });

    // Test order_items join
    const { data: ordersWithItems, error: joinError } = await supabase
      .from("orders")
      .select(`
        order_id,
        status,
        seller_id,
        order_items (
          quantity,
          listing_id,
          seller_product_listings (
            seller_title,
            listing_id
          ),
          listing_variants (
            variant_name,
            sku
          )
        )
      `)
      .eq("seller_id", seller.id)
      .limit(3);
    
    console.log("🔗 Orders with items join:", { ordersWithItems, error: joinError });

  } catch (error) {
    console.error("💥 Test error:", error);
  }
}

// Create test orders for debugging
export async function createTestOrders() {
  console.log("🏗️ Creating test orders...");
  
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      console.log("❌ No authenticated user");
      return;
    }

    const { data: seller } = await supabase
      .from("sellers")
      .select("id")
      .eq("user_id", auth.user.id)
      .single();
    
    if (!seller) {
      console.log("❌ No seller found");
      return;
    }

    // First, check if there are any listings available for this seller
    const { data: listings } = await supabase
      .from("seller_product_listings")
      .select("listing_id, seller_title")
      .eq("seller_id", seller.id)
      .limit(1);

    console.log("📋 Available listings:", listings);

    let listingId = null;
    
    if (!listings || listings.length === 0) {
      console.log("⚠️ No listings found, creating a basic order without listing");
      // For testing, we'll create an order without order_items first
    } else {
      listingId = listings[0].listing_id;
    }

    // Create a test order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: auth.user.id, // Using same user as buyer for testing
        seller_id: seller.id,
        status: "confirmed",
        total_amount: 299.99,
        shipping_cost: 49.99,
        discount_amount: 0,
        final_amount: 349.98,
        payment_status: "paid"
      })
      .select()
      .single();

    console.log("📦 Created test order:", { order, error: orderError });

    if (order && !orderError && listingId) {
      // Create test order item only if we have a listing
      const { data: item, error: itemError } = await supabase
        .from("order_items")
        .insert({
          order_id: order.order_id,
          listing_id: listingId,
          seller_id: seller.id,
          quantity: 2,
          price_per_unit: 149.99,
          subtotal: 299.98
        })
        .select();

      console.log("📋 Created test order item:", { item, error: itemError });
    }

    // Create a second order with different status
    const { data: order2, error: order2Error } = await supabase
      .from("orders")
      .insert({
        buyer_id: auth.user.id,
        seller_id: seller.id,
        status: "pending",
        total_amount: 149.99,
        shipping_cost: 29.99,
        discount_amount: 10,
        final_amount: 169.98,
        payment_status: "unpaid"
      })
      .select()
      .single();

    console.log("📦 Created second test order:", { order2, error: order2Error });

  } catch (error) {
    console.error("💥 Error creating test orders:", error);
  }
}