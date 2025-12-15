import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthenticatedSellerId } from '@/lib/seller-helpers';
import { Bell, AlertCircle, Clock, CheckCircle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface FSSAINotification {
  notification_id: string;
  notification_type: 'seller_kyc_fssai' | 'product_fssai';
  notification_message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  days_until_expiry: number;
  created_at: string;
  product_name?: string;
  variant_name?: string;
  kyc_fssai_number?: string;
  variant_fssai_number?: string;
}

export function FSSAIExpiryNotifications() {
  const [notifications, setNotifications] = useState<FSSAINotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  useEffect(() => {
    fetchNotifications(true);
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('fssai_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fssai_expiry_notifications',
        },
        () => {
          fetchNotifications(false);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchNotifications = async (isInitialLoad: boolean = false) => {
    try {
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) {
        console.log('❌ No seller ID found');
        return;
      }

      console.log('🔍 Fetching FSSAI notifications for seller:', sellerId);

      // Only run FSSAI check on initial load to avoid duplicates
      if (isInitialLoad && !hasFetchedOnce) {
        const { data: checkResult, error: checkError } = await supabase.rpc('check_all_fssai_expiry') as { data: any; error: Error | null };
        if (checkError) {
          console.error('Error running FSSAI check:', checkError);
        } else {
          console.log('✅ FSSAI check result:', checkResult);
        }
        setHasFetchedOnce(true);
      }

      // Fetch notifications
      const { data, error } = await supabase.rpc('get_seller_fssai_notifications', {
        p_seller_id: sellerId,
        p_status: 'pending'
      }) as { data: FSSAINotification[] | null; error: Error | null };

      if (error) {
        console.error('❌ Error fetching notifications:', error);
        throw error;
      }
      
      console.log('📋 Fetched notifications:', data);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching FSSAI notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (notificationId: string) => {
    try {
      console.log('Acknowledging notification:', notificationId);
      const { data, error } = await supabase.rpc('update_fssai_notification_status', {
        p_new_status: 'acknowledged',
        p_notification_id: notificationId
      }) as { data: boolean | null; error: Error | null };

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      console.log('Acknowledge result:', data);
      if (data) {
        toast.success('Notification acknowledged');
        fetchNotifications();
      } else {
        toast.error('Failed to acknowledge notification - permission denied');
      }
    } catch (error) {
      console.error('Error acknowledging notification:', error);
      toast.error('Failed to acknowledge notification');
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      console.log('Dismissing notification:', notificationId);
      const { data, error } = await supabase.rpc('update_fssai_notification_status', {
        p_new_status: 'dismissed',
        p_notification_id: notificationId
      }) as { data: boolean | null; error: Error | null };

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      console.log('Dismiss result:', data);
      if (data) {
        toast.success('Notification dismissed');
        fetchNotifications();
      } else {
        toast.error('Failed to dismiss notification - permission denied');
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
      toast.error('Failed to dismiss notification');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'low':
        return <Bell className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            FSSAI Expiry Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading notifications...</p>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-yellow-500" />
            FSSAI Expiry Alerts
          </CardTitle>
          <CardDescription>All FSSAI licenses are up to date</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const criticalCount = notifications.filter(n => n.priority === 'critical').length;
  const highCount = notifications.filter(n => n.priority === 'high').length;

  return (
    <Card className="border-2 border-orange-200 dark:border-orange-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-orange-600 animate-pulse" />
            <div>
              <CardTitle className="text-orange-900 dark:text-orange-100">
                FSSAI License Expiry Alerts
              </CardTitle>
              <CardDescription>
                {criticalCount > 0 && (
                  <span className="text-red-600 font-semibold">
                    {criticalCount} critical alert{criticalCount > 1 ? 's' : ''}
                  </span>
                )}
                {criticalCount > 0 && highCount > 0 && ' • '}
                {highCount > 0 && (
                  <span className="text-orange-600 font-semibold">
                    {highCount} high priority alert{highCount > 1 ? 's' : ''}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide' : `Show ${notifications.length}`}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {notifications.map((notification) => (
            <Alert
              key={notification.notification_id}
              variant={notification.priority === 'critical' || notification.priority === 'high' ? 'destructive' : 'default'}
              className="relative"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getPriorityIcon(notification.priority)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTitle className="text-sm font-semibold mb-0">
                      {notification.notification_type === 'seller_kyc_fssai'
                        ? 'Business FSSAI License'
                        : `Product: ${notification.product_name}`}
                    </AlertTitle>
                    <Badge variant={getPriorityColor(notification.priority) as 'default' | 'destructive' | 'secondary'}>
                      {notification.priority.toUpperCase()}
                    </Badge>
                  </div>
                  
                  {notification.variant_name && (
                    <p className="text-xs text-muted-foreground">
                      Variant: {notification.variant_name}
                    </p>
                  )}
                  
                  <AlertDescription className="text-sm">
                    {notification.notification_message}
                  </AlertDescription>

                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {notification.days_until_expiry === 0
                        ? 'Expires TODAY'
                        : notification.days_until_expiry === 1
                        ? 'Expires TOMORROW'
                        : `${notification.days_until_expiry} days remaining`}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(notification.notification_id)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(notification.notification_id)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
