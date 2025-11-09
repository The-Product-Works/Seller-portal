import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Seller = Database["public"]["Tables"]["sellers"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

export default function DatabaseTest() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testDatabaseConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("🧪 Testing database connection...");

      // Test basic connection
      const { data: testData, error: testError } = await supabase
        .from("orders")
        .select("count")
        .limit(1);

      console.log("📊 Basic connection test:", { testData, testError });

      // Get all orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .limit(10);

      console.log("📦 Orders query result:", { ordersData, ordersError });

      if (ordersError) {
        throw new Error(`Orders query failed: ${ordersError.message}`);
      }

      setOrders(ordersData || []);

      // Get all sellers
      const { data: sellersData, error: sellersError } = await supabase
        .from("sellers")
        .select("*")
        .limit(5);

      console.log("👥 Sellers query result:", { sellersData, sellersError });
      setSellers(sellersData || []);

      // Get all users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .limit(5);

      console.log("👤 Users query result:", { usersData, usersError });
      setUsers(usersData || []);

    } catch (err) {
      console.error("❌ Database test failed:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const createTestOrder = async () => {
    try {
      console.log("🏗️ Creating test order...");

      // First, let's see if we have any sellers
      const { data: sellersCheck } = await supabase
        .from("sellers")
        .select("id")
        .limit(1);

      if (!sellersCheck || sellersCheck.length === 0) {
        setError("No sellers found in database. Need to create a seller first.");
        return;
      }

      // Check if we have any users
      const { data: usersCheck } = await supabase
        .from("users")
        .select("id")
        .limit(1);

      if (!usersCheck || usersCheck.length === 0) {
        setError("No users found in database. Need to create a user first.");
        return;
      }

      const sellerId = sellersCheck[0].id;
      const buyerId = usersCheck[0].id;

      // Create test order
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: buyerId,
          seller_id: sellerId,
          status: "confirmed",
          total_amount: 299.99,
          final_amount: 299.99,
          payment_status: "paid"
        })
        .select()
        .single();

      if (orderError) {
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      console.log("✅ Test order created:", newOrder);
      
      // Refresh the orders list
      testDatabaseConnection();

    } catch (err) {
      console.error("❌ Failed to create test order:", err);
      setError(err instanceof Error ? err.message : "Failed to create test order");
    }
  };

  useEffect(() => {
    testDatabaseConnection();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testDatabaseConnection} disabled={loading}>
              {loading ? "Testing..." : "Test Connection"}
            </Button>
            <Button onClick={createTestOrder} variant="secondary">
              Create Test Order
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-sm">❌ Error: {error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Orders ({orders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs">
                  {orders.length === 0 ? (
                    <p className="text-gray-500">No orders found</p>
                  ) : (
                    orders.map((order) => (
                      <div key={order.order_id} className="p-1 bg-gray-50 rounded">
                        <p>ID: {order.order_id.slice(0, 8)}</p>
                        <p>Status: {order.status}</p>
                        <p>Amount: ₹{order.total_amount}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sellers ({sellers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs">
                  {sellers.length === 0 ? (
                    <p className="text-gray-500">No sellers found</p>
                  ) : (
                    sellers.map((seller) => (
                      <div key={seller.id} className="p-1 bg-gray-50 rounded">
                        <p>ID: {seller.id.slice(0, 8)}</p>
                        <p>Business: {seller.business_name || "N/A"}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Users ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs">
                  {users.length === 0 ? (
                    <p className="text-gray-500">No users found</p>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="p-1 bg-gray-50 rounded">
                        <p>ID: {user.id.slice(0, 8)}</p>
                        <p>Email: {user.email}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}