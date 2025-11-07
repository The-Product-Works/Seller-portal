// Simple test to check if notifications query works
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";

export async function testNotificationsQuery() {
  try {
    console.log("=== TEST: Notifications Query ===");
    
    // Get seller ID
    const sellerId = await getAuthenticatedSellerId();
    console.log("Seller ID:", sellerId);
    
    if (!sellerId) {
      console.error("No seller ID found");
      return;
    }

    // Test 1: Query all notifications (no filter)
    console.log("\nTest 1: Query ALL notifications (no seller_id filter)");
    const { data: allData, error: allError } = await supabase
      .from("notifications")
      .select("*")
      .limit(5);
    
    if (allError) {
      console.error("Error:", allError);
    } else {
      console.log("Success! Got", allData?.length, "notifications");
      if (allData && allData.length > 0) {
        console.log("First notification:", allData[0]);
      }
    }

    // Test 2: Query with seller filter
    console.log("\nTest 2: Query notifications filtered by seller_id");
    const { data: sellerData, error: sellerError } = await supabase
      .from("notifications")
      .select("*")
      .eq("related_seller_id", sellerId)
      .limit(5);
    
    if (sellerError) {
      console.error("Error:", sellerError);
    } else {
      console.log("Success! Got", sellerData?.length, "notifications for this seller");
    }

    // Test 3: Check table structure
    console.log("\nTest 3: Get table info");
    const { data: tableInfo, error: tableError } = await supabase
      .from("notifications")
      .select("*")
      .limit(1);
    
    if (tableInfo && tableInfo.length > 0) {
      console.log("Table columns:", Object.keys(tableInfo[0]));
    }

  } catch (error) {
    console.error("Test error:", error);
  }
}

export default testNotificationsQuery;
