import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAuthenticatedSellerId, getAuthenticatedUserId } from "@/lib/seller-helpers";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: string;
  related_seller_id?: string;
  seller_id?: string;
  related_product_id?: string | null;
  related_bundle_id?: string | null;
  metadata?: Record<string, unknown>;
}

interface LowStockNotificationsProps {
  onProductClick?: (productId: string) => void;
  onBundleClick?: (bundleId: string) => void;
}

export function LowStockNotifications({ onProductClick, onBundleClick }: LowStockNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Get auth user ID for RLS policy to work correctly
      // Note: related_seller_id in notifications table stores auth.users.id (not sellers.id)
      const authUserId = await getAuthenticatedUserId();
      console.log("=== LowStockNotifications DEBUG ===");
      console.log("loadNotifications called with authUserId:", authUserId);
      if (!authUserId) {
        console.log("No auth user ID found");
        setLoading(false);
        return;
      }

      // Query notifications by related_seller_id (which contains auth.users.id)
      console.log("Querying notifications table with authUserId:", authUserId);
      
      // Build the query step by step to see where it fails
      let query = supabase
        .from("notifications")
        .select("*");
      
      query = query.eq("type", "low_stock");
      query = query.eq("is_read", false);
      query = query.eq("related_seller_id", authUserId);
      query = query.order("created_at", { ascending: false });
      query = query.limit(10);

      const { data, error } = await query;

      console.log("Query response - Data:", data);
      console.log("Query response - Error:", error);
      console.log("=== END DEBUG ===");

      if (error) {
        console.error("Error loading notifications:", error);
        console.error("Error details:", error);
        toast({
          title: "Error",
          description: "Failed to load low stock notifications: " + error.message,
          variant: "destructive",
        });
      } else {
        console.log("Loaded notifications:", data);
        setNotifications(data || []);
      }
    } catch (error) {
      console.error("Error in loadNotifications:", error);
      toast({
        title: "Error",
        description: "Exception in loadNotifications: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    
    const channel = supabase
      .channel('low_stock_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'type=eq.low_stock',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          
          toast({
            title: "Low Stock Alert",
            description: newNotification.message,
            variant: "destructive",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marking notification as read:", error);
        toast({
          title: "Error",
          description: "Failed to update notification",
          variant: "destructive",
        });
      } else {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        toast({
          title: "Success",
          description: "Notification dismissed",
        });
      }
    } catch (error) {
      console.error("Error in handleMarkAsRead:", error);
    }
  };

  const handleDismissAll = async () => {
    try {
      // Use auth user ID for RLS policy to work
      const authUserId = await getAuthenticatedUserId();
      if (!authUserId) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("type", "low_stock")
        .eq("is_read", false)
        .eq("related_seller_id", authUserId);

      if (error) {
        console.error("Error dismissing all notifications:", error);
        toast({
          title: "Error",
          description: "Failed to dismiss notifications",
          variant: "destructive",
        });
      } else {
        setNotifications([]);
        toast({
          title: "Success",
          description: "All notifications dismissed",
        });
      }
    } catch (error) {
      console.error("Error in handleDismissAll:", error);
    }
  };

  if (loading) {
    return null;
  }

  // Only show card if there are actual low stock notifications
  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            <span>Low Stock Alerts ({notifications.length})</span>
          </CardTitle>
          {notifications.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismissAll}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Dismiss All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="flex items-start gap-3 p-3 bg-white rounded-lg border border-orange-200 shadow-sm"
          >
            <Package className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {notification.title && (
                    <p className="font-medium text-orange-900 text-sm mb-1">
                      {notification.title}
                    </p>
                  )}
                  <p className="text-orange-700 text-sm">
                    {notification.message}
                  </p>
                  <p className="text-orange-600 text-xs mt-2">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                  className="text-orange-600 hover:text-orange-800 hover:bg-orange-100 flex-shrink-0"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
