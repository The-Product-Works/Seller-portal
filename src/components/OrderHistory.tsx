import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/database.types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

interface OrderWithRelations extends Order {
  product?: { name?: string; title?: string } | null;
  bundle?: { title?: string } | null;
}

export function OrderHistory({ sellerId }: { sellerId: string | null }) {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`*`)
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setOrders((data as OrderWithRelations[]) || []);
    } catch (err) {
      console.error("Error loading orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="p-4 text-center">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No recent orders</div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.order_id} className="p-3 border rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold">Order {o.order_id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">₹{o.final_amount.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{o.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
