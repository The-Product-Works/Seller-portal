import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HealthScoreDashboardProps {
  sellerId?: string | null;
}

export function HealthScoreDashboard({ sellerId }: HealthScoreDashboardProps) {
  const [healthScore, setHealthScore] = useState(0);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    successfulOrders: 0,
    cancelledOrders: 0,
    returnedOrders: 0,
    activeProducts: 0,
    draftProducts: 0,
    averageRating: 0,
    responseTime: 0, // hours
    shippingAccuracy: 0, // percentage
    fulfillmentRate: 0, // percentage
    returnRate: 0, // percentage
    cancellationRate: 0, // percentage
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sellerId) {
      calculateHealthScore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const calculateHealthScore = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      // Get order statistics
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, created_at")
        .eq("seller_id", sellerId);

      if (ordersError || !orders) {
        setLoading(false);
        return;
      }

      const totalOrders = orders.length;
      const successfulOrders = orders.filter((o) => o.status === "delivered").length;
      const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;

      // Get return statistics
      const { data: returns } = await supabase
        .from("order_returns")
        .select("id")
        .eq("seller_id", sellerId)
        .eq("status", "approved");

      const returnedOrders = returns?.length || 0;

      // Get product statistics
      const { count: activeCount } = await supabase
        .from("seller_product_listings")
        .select("listing_id", { count: "exact" })
        .eq("seller_id", sellerId)
        .eq("status", "active");

      const { count: draftCount } = await supabase
        .from("seller_product_listings")
        .select("listing_id", { count: "exact" })
        .eq("seller_id", sellerId)
        .eq("status", "draft");

      // Calculate metrics
      const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
      const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;
      const shippingAccuracy = totalOrders > 0 ? ((successfulOrders / totalOrders) * 100) : 0;
      const fulfillmentRate = totalOrders > 0 ? ((successfulOrders / totalOrders) * 100) : 0;

      // Calculate health score using weighted formula:
      // 40% - Order Fulfillment Rate (successful orders)
      // 25% - Return Rate (lower is better)
      // 20% - Cancellation Rate (lower is better)
      // 10% - Product Activity (active vs draft ratio)
      // 5% - Response Time (assumed 24 hours standard)

      const fulfillmentScore = (successfulOrders / Math.max(totalOrders, 1)) * 40; // Max 40 points
      const returnPenalty = Math.min(returnRate * 0.25, 25); // Max penalty 25 points
      const cancellationPenalty = Math.min(cancellationRate * 0.20, 20); // Max penalty 20 points
      const productActivityScore = activeCount && (activeCount || 0) > 0 ? 10 : 5; // Max 10 points
      const responseScore = 5; // Assuming good response time

      let score =
        fulfillmentScore +
        (25 - returnPenalty) +
        (20 - cancellationPenalty) +
        productActivityScore +
        responseScore;

      // Cap score at 100
      score = Math.min(Math.max(score, 0), 100);

      setMetrics({
        totalOrders,
        successfulOrders,
        cancelledOrders,
        returnedOrders,
        activeProducts: activeCount || 0,
        draftProducts: draftCount || 0,
        averageRating: 4.5, // TODO: Fetch from actual ratings
        responseTime: 8, // TODO: Calculate from actual response times
        shippingAccuracy,
        fulfillmentRate,
        returnRate,
        cancellationRate,
      });

      setHealthScore(score);
    } catch (error) {
      console.error("Error calculating health score:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Calculating health score...</div>
        </CardContent>
      </Card>
    );
  }

  const getHealthBadge = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "bg-green-500", variant: "default" as const };
    if (score >= 75) return { label: "Good", color: "bg-blue-500", variant: "default" as const };
    if (score >= 60) return { label: "Fair", color: "bg-yellow-500", variant: "default" as const };
    return { label: "Needs Improvement", color: "bg-red-500", variant: "default" as const };
  };

  const badge = getHealthBadge(healthScore);

  return (
    <div className="space-y-6">
      {/* Main Health Score Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>Seller Health Score</CardTitle>
            <Badge className={badge.color}>{badge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Overall Score</span>
              <span className="text-4xl font-bold">{Math.round(healthScore)}/100</span>
            </div>
            <Progress value={healthScore} className="h-3" />
            <p className="text-sm text-muted-foreground">
              Your seller health score is based on fulfillment rate, return rate, cancellation rate,
              product activity, and response time.
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Fulfillment Rate */}
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Fulfillment Rate</p>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold">
                {metrics.totalOrders > 0
                  ? ((metrics.successfulOrders / metrics.totalOrders) * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.successfulOrders}/{metrics.totalOrders} delivered
              </p>
            </div>

            {/* Return Rate */}
            <div className="space-y-2 p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Return Rate</p>
                <TrendingDown className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold">{metrics.returnRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                {metrics.returnedOrders} approved returns
              </p>
            </div>

            {/* Cancellation Rate */}
            <div className="space-y-2 p-3 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Cancellation Rate</p>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <p className="text-2xl font-bold">{metrics.cancellationRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                {metrics.cancelledOrders} cancelled orders
              </p>
            </div>

            {/* Shipping Accuracy */}
            <div className="space-y-2 p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium">Shipping Accuracy</p>
              <p className="text-2xl font-bold">{metrics.shippingAccuracy.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">On-time deliveries</p>
            </div>

            {/* Active Products */}
            <div className="space-y-2 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium">Active Products</p>
              <p className="text-2xl font-bold">{metrics.activeProducts}</p>
              <p className="text-xs text-muted-foreground">
                {metrics.draftProducts} drafts
              </p>
            </div>

            {/* Response Time */}
            <div className="space-y-2 p-3 bg-indigo-50 rounded-lg">
              <p className="text-sm font-medium">Response Time</p>
              <p className="text-2xl font-bold">{metrics.responseTime}h</p>
              <p className="text-xs text-muted-foreground">Average response</p>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold">Score Composition</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Order Fulfillment (40%)</span>
                <span className="font-semibold">
                  {Math.round(
                    (metrics.successfulOrders / Math.max(metrics.totalOrders, 1)) * 40
                  )}
                  /40
                </span>
              </div>
              <div className="flex justify-between">
                <span>Return Rate (25%)</span>
                <span className="font-semibold">
                  {Math.round(25 - metrics.returnRate * 0.25)}/25
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cancellation Rate (20%)</span>
                <span className="font-semibold">
                  {Math.round(20 - metrics.cancellationRate * 0.20)}/20
                </span>
              </div>
              <div className="flex justify-between">
                <span>Product Activity (10%)</span>
                <span className="font-semibold">
                  {metrics.activeProducts > 0 ? 10 : 5}/10
                </span>
              </div>
              <div className="flex justify-between">
                <span>Response Time (5%)</span>
                <span className="font-semibold">5/5</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="border-t pt-4 bg-blue-50 p-3 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">Recommendations</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {metrics.cancellationRate > 5 && (
                <li>• Try to reduce order cancellations (currently {metrics.cancellationRate.toFixed(1)}%)</li>
              )}
              {metrics.returnRate > 5 && (
                <li>• Focus on reducing return rate (currently {metrics.returnRate.toFixed(1)}%)</li>
              )}
              {metrics.draftProducts > metrics.activeProducts && (
                <li>• Consider publishing more draft products to increase visibility</li>
              )}
              {metrics.fulfillmentRate < 90 && (
                <li>• Improve order fulfillment rate (currently {metrics.fulfillmentRate.toFixed(1)}%)</li>
              )}
              {healthScore >= 90 && <li>✨ Excellent seller health! Keep up the great work!</li>}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
