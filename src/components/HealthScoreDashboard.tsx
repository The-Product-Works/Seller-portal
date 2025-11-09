import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertCircle, Edit2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface HealthScoreDashboardProps {
  sellerId: string;
}

export function HealthScoreDashboard({ sellerId }: HealthScoreDashboardProps) {
  const [healthScore, setHealthScore] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editScore, setEditScore] = useState("");
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    successfulOrders: 0,
    cancelledOrders: 0,
    returnedOrders: 0,
    activeProducts: 0,
    draftProducts: 0,
    responseTime: 24, // hours
    fulfillmentRate: 0, // percentage
    shippingAccuracy: 0, // percentage
    returnRate: 0, // percentage
    cancellationRate: 0, // percentage
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (sellerId) {
      calculateHealthScore();
    }
  }, [sellerId, calculateHealthScore]);

  const calculateHealthScore = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      // Check if there's a manually set health score first
      const { data: manualScore } = await supabase
        .from("seller_health")
        .select("health_score")
        .eq("seller_id", sellerId)
        .single();

      if (manualScore?.health_score) {
        setHealthScore(manualScore.health_score);
        setLoading(false);
        return;
      }

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
      // - Order fulfillment: 40%
      // - Return rate: 25% (inverted - lower is better)
      // - Cancellation rate: 20% (inverted - lower is better)
      // - Product activity: 10%
      // - Response time: 5%

      const fulfillmentScore = fulfillmentRate * 0.4;
      const returnScore = Math.max(0, 25 - returnRate * 0.25);
      const cancellationScore = Math.max(0, 20 - cancellationRate * 0.20);
      const productScore = activeCount && activeCount > 0 ? 10 : 5;
      const responseScore = 5; // Assuming good response time for now

      const calculatedScore = fulfillmentScore + returnScore + cancellationScore + productScore + responseScore;

      setMetrics({
        totalOrders,
        successfulOrders,
        cancelledOrders,
        returnedOrders,
        activeProducts: activeCount || 0,
        draftProducts: draftCount || 0,
        responseTime: 24,
        fulfillmentRate,
        shippingAccuracy,
        returnRate,
        cancellationRate,
      });

      setHealthScore(Math.min(100, Math.max(0, calculatedScore)));
    } catch (error) {
      console.error("Error calculating health score:", error);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  const handleEditScore = async () => {
    if (!editScore || isNaN(Number(editScore))) {
      toast({
        title: "Invalid Score",
        description: "Please enter a valid number between 0-100",
        variant: "destructive",
      });
      return;
    }

    const newScore = Math.min(100, Math.max(0, Number(editScore)));

    try {
      const { error } = await supabase
        .from("seller_health")
        .upsert({
          seller_id: sellerId,
          health_score: newScore,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "seller_id"
        });

      if (error) throw error;

      setHealthScore(newScore);
      setShowEditDialog(false);
      setEditScore("");
      toast({
        title: "Health Score Updated",
        description: `Health score updated to ${newScore}/100`,
      });
    } catch (error) {
      console.error("Error updating health score:", error);
      toast({
        title: "Error",
        description: "Failed to update health score",
        variant: "destructive",
      });
    }
  };

  const getHealthBadge = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "bg-green-500", variant: "default" as const };
    if (score >= 75) return { label: "Good", color: "bg-blue-500", variant: "default" as const };
    if (score >= 60) return { label: "Fair", color: "bg-yellow-500", variant: "default" as const };
    return { label: "Needs Improvement", color: "bg-red-500", variant: "default" as const };
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

  const badge = getHealthBadge(healthScore);

  return (
    <div className="space-y-6">
      {/* Main Health Score Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>Seller Health Score</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={badge.color}>{badge.label}</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditScore(healthScore.toString());
                  setShowEditDialog(true);
                }}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
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

      {/* Edit Health Score Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Health Score</AlertDialogTitle>
            <AlertDialogDescription>
              Manually update your seller health score. This will override the calculated score.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="score">Health Score (0-100)</Label>
            <Input
              id="score"
              type="number"
              min="0"
              max="100"
              value={editScore}
              onChange={(e) => setEditScore(e.target.value)}
              placeholder="Enter score between 0-100"
            />
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditScore}>
              Update Score
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}