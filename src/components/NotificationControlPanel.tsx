// src/components/NotificationControlPanel.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellOff, 
  Monitor, 
  Activity, 
  Package, 
  ShoppingCart, 
  Star, 
  DollarSign, 
  RotateCcw, 
  User,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { realtimeNotificationService, NotificationConfig } from '@/services/real-time-notifications';

interface NotificationControlPanelProps {
  sellerId: string;
  sellerEmail: string;
}

export const NotificationControlPanel: React.FC<NotificationControlPanelProps> = ({
  sellerId,
  sellerEmail
}) => {
  const { toast } = useToast();
  
  // State
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<NotificationConfig>({
    enabled: true,  // Always enable for testing
    sellerId: 'ALL',  // Monitor all sellers for now
    monitorOrders: true,
    monitorInventory: true,
    monitorReviews: false,  // Disable reviews temporarily
    monitorPayouts: true,
    monitorReturns: true,
    monitorAccount: true,
  });
  const [activeSubscriptions, setActiveSubscriptions] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // Check initial status
  useEffect(() => {
    const currentConfig = realtimeNotificationService.getConfig();
    const monitoring = realtimeNotificationService.isMonitoring();
    const subscriptions = realtimeNotificationService.getActiveSubscriptions();
    
    if (currentConfig) {
      setConfig(currentConfig);
    }
    setIsMonitoring(monitoring);
    setActiveSubscriptions(subscriptions);
    
    addLog(`Notification Control Panel initialized. Monitoring: ${monitoring ? 'ON' : 'OFF'}`);
  }, []);

  // Periodic status updates - but don't override manual state
  useEffect(() => {
    const interval = setInterval(() => {
      const monitoring = realtimeNotificationService.isMonitoring();
      const subscriptions = realtimeNotificationService.getActiveSubscriptions();
      
      // Only update if the states are different to prevent unnecessary re-renders
      if (monitoring !== isMonitoring) {
        console.log(`🔄 Monitoring state changed: ${isMonitoring} -> ${monitoring}`);
        setIsMonitoring(monitoring);
        
        // If it unexpectedly went inactive, try to restart it
        if (!monitoring && config.enabled) {
          addLog('⚠️ Monitoring became inactive - attempting restart...');
          realtimeNotificationService.startMonitoring(config)
            .then(() => {
              setIsMonitoring(true);
              addLog('✅ Monitoring restarted successfully');
            })
            .catch(error => {
              addLog(`❌ Failed to restart monitoring: ${error.message}`);
            });
        }
      }
      
      setActiveSubscriptions(subscriptions);
    }, 5000);  // Check every 5 seconds

    return () => clearInterval(interval);
  }, [isMonitoring, config]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-19), logEntry]); // Keep last 20 logs
  };

  const handleToggleMonitoring = async () => {
    setIsLoading(true);
    
    try {
      if (isMonitoring) {
        // Only stop if user explicitly wants to stop
        await realtimeNotificationService.stopMonitoringCompletely();
        addLog('🛑 Real-time notifications stopped');
        toast({
          title: "Notifications Stopped",
          description: "Real-time email notifications have been disabled.",
        });
        setIsMonitoring(false);
      } else {
        // Start monitoring with persistent configuration
        await realtimeNotificationService.startMonitoring({
          ...config,
          enabled: true  // Force enable
        });
        addLog('🚀 Real-time notifications started and locked ACTIVE');
        toast({
          title: "Notifications Started",
          description: "Real-time email notifications are now ACTIVE and persistent!",
          variant: "default"
        });
        setIsMonitoring(true);
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error);
      addLog(`❌ Error: ${error.message}`);
      toast({
        title: "Error",
        description: "Failed to toggle notification monitoring.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (key: keyof NotificationConfig, value: boolean) => {
    const newConfig = { ...config, [key]: value, enabled: true };  // Always keep enabled
    setConfig(newConfig);
    addLog(`Configuration updated: ${key} = ${value}`);
    
    // If monitoring is active, restart with new config but keep it active
    if (isMonitoring) {
      // Don't stop completely, just restart with new config
      realtimeNotificationService.stopMonitoring()
        .then(() => realtimeNotificationService.startMonitoring(newConfig))
        .then(() => {
          addLog('🔄 Monitoring restarted with new configuration - staying ACTIVE');
          setIsMonitoring(true);  // Ensure it stays active
        })
        .catch(error => addLog(`❌ Error restarting: ${error.message}`));
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  const monitoringSections = [
    {
      key: 'monitorOrders' as keyof NotificationConfig,
      icon: ShoppingCart,
      title: 'Orders',
      description: 'New orders, cancellations',
      notifications: ['New Order', 'Order Cancelled']
    },
    {
      key: 'monitorInventory' as keyof NotificationConfig,
      icon: Package,
      title: 'Inventory',
      description: 'Stock alerts, out of stock',
      notifications: ['Low Stock Alert', 'Out of Stock']
    },
    {
      key: 'monitorReviews' as keyof NotificationConfig,
      icon: Star,
      title: 'Reviews',
      description: 'New product reviews',
      notifications: ['New Review']
    },
    {
      key: 'monitorPayouts' as keyof NotificationConfig,
      icon: DollarSign,
      title: 'Payouts',
      description: 'Payment processing',
      notifications: ['Payout Processed']
    },
    {
      key: 'monitorReturns' as keyof NotificationConfig,
      icon: RotateCcw,
      title: 'Returns',
      description: 'Return requests, refunds',
      notifications: ['Return Request', 'Refund Completed']
    },
    {
      key: 'monitorAccount' as keyof NotificationConfig,
      icon: User,
      title: 'Account',
      description: 'Account status changes',
      notifications: ['Account Approved']
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMonitoring ? (
              <Bell className="h-5 w-5 text-green-600" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <CardTitle>🔔 Real-Time Email Notifications</CardTitle>
              <CardDescription>
                Automatically send emails when database events occur
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${
              isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            }`} />
            <Badge variant={isMonitoring ? "default" : "secondary"}>
              {isMonitoring ? 'ACTIVE' : 'INACTIVE'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5" />
            <div>
              <Label className="text-base font-medium">
                Real-Time Monitoring
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable automatic email notifications for all events
              </p>
            </div>
          </div>
          <Button
            onClick={handleToggleMonitoring}
            disabled={isLoading}
            variant={isMonitoring ? "destructive" : "default"}
            size="lg"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isMonitoring ? (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Start Monitoring
              </>
            )}
          </Button>
        </div>

        {/* Status Alert */}
        <Alert className={isMonitoring ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
          {isMonitoring ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-amber-600" />
          )}
          <AlertDescription>
            <strong>Status:</strong> {isMonitoring ? (
              <>
                ✅ Real-time monitoring is ACTIVE. Emails will be sent to{' '}
                <code className="bg-green-100 px-1 py-0.5 rounded text-xs">{sellerEmail}</code>
                {' '}when events occur.
                <div className="mt-2 text-xs">
                  Active subscriptions: {activeSubscriptions.join(', ') || 'None'}
                </div>
              </>
            ) : (
              '⏸️ Real-time monitoring is INACTIVE. No automatic emails will be sent.'
            )}
          </AlertDescription>
        </Alert>

        {/* Configuration Sections */}
        <div className="grid gap-4">
          <h4 className="font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitoring Configuration
          </h4>
          
          {monitoringSections.map(section => {
            const IconComponent = section.icon;
            const isEnabled = config[section.key] as boolean;
            
            return (
              <div
                key={section.key}
                className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                  isEnabled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className={`h-5 w-5 ${isEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <div className="font-medium">{section.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {section.description}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {section.notifications.map(notif => (
                        <Badge key={notif} variant="outline" className="text-xs">
                          {notif}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleConfigChange(section.key, checked)}
                  disabled={isLoading}
                />
              </div>
            );
          })}
        </div>

        {/* Activity Logs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Activity Logs</h4>
            <Button onClick={clearLogs} variant="ghost" size="sm">
              Clear Logs
            </Button>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
            {logs.length > 0 ? (
              <pre className="text-xs whitespace-pre-wrap">
                {logs.join('\n')}
              </pre>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No activity logs yet. Enable monitoring to see real-time events.
              </div>
            )}
          </div>
        </div>

        {/* Configuration Info */}
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong> When enabled, this system listens for database changes using Supabase real-time subscriptions. 
            When events occur (new orders, stock changes, etc.), appropriate emails are automatically sent via the proxy server.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default NotificationControlPanel;