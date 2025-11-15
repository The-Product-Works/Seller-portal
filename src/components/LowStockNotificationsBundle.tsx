import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAuthenticatedUserId } from "@/lib/seller-helpers";

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

interface LowStockNotificationsBundleProps {
  onBundleClick?: (bundleId: string) => void;
  showRestockButton?: boolean;
}

export function LowStockNotificationsBundle({ onBundleClick, showRestockButton = true }: LowStockNotificationsBundleProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Get auth user ID for RLS policy to work correctly
      const authUserId = await getAuthenticatedUserId();
      console.log("=== LowStockNotificationsBundle DEBUG ===");
      console.log("loadNotifications called with authUserId:", authUserId);
      if (!authUserId) {
        console.log("No auth user ID found");
        setLoading(false);
        return;
      }

      // Query bundle-specific low stock notifications
      console.log("Querying bundle notifications table with authUserId:", authUserId);
      
      let query = supabase
        .from("notifications")
        .select("*");
      
      query = query.eq("type", "low_stock");
      query = query.eq("is_read", false);
      query = query.eq("related_seller_id", authUserId);
      // Filter for bundle alerts only - must have related_bundle_id
      query = query.not("related_bundle_id", "is", null);
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
          description: "Failed to load bundle low stock notifications: " + error.message,
          variant: "destructive",
        });
      } else {
        console.log("Loaded bundle notifications:", data);
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
      .channel('low_stock_bundle_notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('Real-time update on bundle notifications:', payload);
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const authUserId = await getAuthenticatedUserId();
      if (!authUserId) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("related_seller_id", authUserId);

      if (error) {
        console.error("Error marking notification as read:", error);
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

      // Get all bundle alert IDs first to update them
      const { data: bundleNotifications } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", "low_stock")
        .eq("is_read", false)
        .eq("related_seller_id", authUserId)
        .not("related_bundle_id", "is", null);

      if (bundleNotifications && bundleNotifications.length > 0) {
        const bundleIds = bundleNotifications.map(n => n.id);
        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .in("id", bundleIds);

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
            description: "All bundle notifications dismissed",
          });
        }
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
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <AlertTriangle className="h-5 w-5" />
            <span>Bundle Low Stock Alerts ({notifications.length})</span>
          </CardTitle>
          {notifications.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismissAll}
              className="border-purple-300 text-purple-700 hover:bg-purple-100"
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
            className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-200 shadow-sm"
          >
            <Package className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {notification.title && (
                    <p className="font-medium text-purple-900 text-sm mb-1">
                      {notification.title}
                    </p>
                  )}
                  <p className="text-purple-700 text-sm">
                    {notification.message}
                  </p>
                  <p className="text-purple-600 text-xs mt-2">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                  {showRestockButton && notification.related_bundle_id && (
                    <Button
                      size="sm"
                      className="mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => {
                        navigate(`/inventory?restockBundleId=${notification.related_bundle_id}`);
                        handleMarkAsRead(notification.id);
                      }}
                    >
                      Restock Bundle Now
                    </Button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                  className="text-purple-600 hover:text-purple-800 hover:bg-purple-100 flex-shrink-0"
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
