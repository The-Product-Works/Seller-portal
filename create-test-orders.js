// Simple script to create test orders
// Run this in browser console when logged in as a seller

async function createTestOrders() {
  const { supabase } = await import('@/integrations/supabase/client');
  
  try {
    console.log("🏗️ Creating test orders...");

    // First, check if we have a seller and user
    const { data: sellers } = await supabase.from("sellers").select("id").limit(1);
    const { data: users } = await supabase.from("users").select("id").limit(1);
    
    if (!sellers || sellers.length === 0) {
      console.log("❌ No sellers found");
      return;
    }
    
    if (!users || users.length === 0) {
      console.log("❌ No users found");
      return;
    }

    const sellerId = sellers[0].id;
    const buyerId = users[0].id;

    // Create test orders
    const testOrders = [
      {
        buyer_id: buyerId,
        seller_id: sellerId,
        status: "confirmed",
        total_amount: 299.99,
        final_amount: 299.99,
        payment_status: "paid"
      },
      {
        buyer_id: buyerId,
        seller_id: sellerId,
        status: "packed",
        total_amount: 199.99,
        final_amount: 199.99,
        payment_status: "paid"
      },
      {
        buyer_id: buyerId,
        seller_id: sellerId,
        status: "shipped",
        total_amount: 149.99,
        final_amount: 149.99,
        payment_status: "paid"
      }
    ];

    for (const orderData of testOrders) {
      const { data, error } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (error) {
        console.error("❌ Error creating order:", error);
      } else {
        console.log("✅ Created order:", data.order_id, "Status:", data.status);
      }
    }

    console.log("🎉 Test orders created successfully!");
    
  } catch (error) {
    console.error("❌ Failed to create test orders:", error);
  }
}

// To use: paste this in browser console and run createTestOrders()
window.createTestOrders = createTestOrders;