// Simple test to check orders
console.log("Testing order navigation...");

// Test 1: Direct URL access
window.location.hash = "#/orders/test-order-123";

// Test 2: Check if orders exist
async function checkOrders() {
  try {
    const { supabase } = await import('./integrations/supabase/client');
    
    console.log("🔍 Checking for orders...");
    
    const { data: orders, error } = await supabase
      .from("orders")
      .select("order_id, status, total_amount")
      .limit(5);
    
    console.log("📦 Orders found:", orders);
    console.log("❌ Error:", error);
    
    if (orders && orders.length > 0) {
      console.log("✅ Found orders, testing navigation to first order...");
      const firstOrderId = orders[0].order_id;
      console.log("🔗 Navigating to:", `/orders/${firstOrderId}`);
      
      // Test navigation
      window.location.hash = `#/orders/${firstOrderId}`;
    } else {
      console.log("❌ No orders found - need to create test orders");
    }
    
  } catch (err) {
    console.error("❌ Error checking orders:", err);
  }
}

checkOrders();