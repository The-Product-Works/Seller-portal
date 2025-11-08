import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Award,
  Leaf,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdvancedHealthMetrics {
  overallScore: number;
  productQualityScore: number;
  businessPerformanceScore: number;
  customerSatisfactionScore: number;
  certificationScore: number;
  
  // Product Quality Metrics
  ingredientQuality: number;
  allergenSafety: number;
  organicPercentage: number;
  certificationCount: number;
  
  // Business Performance
  fulfillmentRate: number;
  returnRate: number;
  cancellationRate: number;
  responseTime: number;
  
  // Detailed Breakdown
  totalProducts: number;
  activeProducts: number;
  organicProducts: number;
  certifiedProducts: number;
  lowAllergenProducts: number;
}

interface AdvancedHealthScoreDashboardProps {
  sellerId: string;
}

export function AdvancedHealthScoreDashboard({ sellerId }: AdvancedHealthScoreDashboardProps) {
  const [metrics, setMetrics] = useState<AdvancedHealthMetrics>({
    overallScore: 0,
    productQualityScore: 0,
    businessPerformanceScore: 0,
    customerSatisfactionScore: 0,
    certificationScore: 0,
    ingredientQuality: 0,
    allergenSafety: 0,
    organicPercentage: 0,
    certificationCount: 0,
    fulfillmentRate: 0,
    returnRate: 0,
    cancellationRate: 0,
    responseTime: 24,
    totalProducts: 0,
    activeProducts: 0,
    organicProducts: 0,
    certifiedProducts: 0,
    lowAllergenProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (sellerId) {
      calculateAdvancedHealthScore();
    }
  }, [sellerId, calculateAdvancedHealthScore]);

  const calculateAdvancedHealthScore = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      // Get product data with additional quality metrics
      const { data: products, error: productsError } = await supabase
        .from("seller_product_listings")
        .select(`
          listing_id,
          seller_title,
          status,
          base_price,
          total_stock_quantity,
          category,
          ingredients,
          allergen_info,
          certifications,
          is_organic,
          created_at
        `)
        .eq("seller_id", sellerId);

      if (productsError) {
        console.error("Error fetching products:", productsError);
        setLoading(false);
        return;
      }

      // Get order statistics (excluding cancelled and refunded)
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, created_at")
        .eq("seller_id", sellerId);

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
      }

      // Get return statistics
      const { data: returns } = await supabase
        .from("order_returns")
        .select("id, status")
        .eq("seller_id", sellerId);

      // Calculate product quality metrics
      const totalProducts = products?.length || 0;
      const activeProducts = products?.filter(p => p.status === "active").length || 0;
      
      // Organic products
      const organicProducts = products?.filter(p => p.is_organic === true).length || 0;
      const organicPercentage = totalProducts > 0 ? (organicProducts / totalProducts) * 100 : 0;

      // Certification analysis
      let totalCertifications = 0;
      let certifiedProducts = 0;
      products?.forEach(product => {
        if (product.certifications && product.certifications.length > 0) {
          certifiedProducts++;
          totalCertifications += product.certifications.length;
        }
      });

      // Allergen safety analysis
      let lowAllergenProducts = 0;
      let ingredientQualityScore = 0;
      products?.forEach(product => {
        // Check for common allergens
        const allergenInfo = product.allergen_info || [];
        const commonAllergens = ['nuts', 'dairy', 'gluten', 'soy', 'eggs'];
        const hasCommonAllergens = commonAllergens.some(allergen => 
          allergenInfo.some((info: string) => info.toLowerCase().includes(allergen))
        );
        
        if (!hasCommonAllergens) {
          lowAllergenProducts++;
        }

        // Ingredient quality (more ingredients = potentially better quality)
        const ingredients = product.ingredients || [];
        if (ingredients.length >= 5) {
          ingredientQualityScore += 1;
        }
      });

      const allergenSafety = totalProducts > 0 ? (lowAllergenProducts / totalProducts) * 100 : 0;
      const ingredientQuality = totalProducts > 0 ? (ingredientQualityScore / totalProducts) * 100 : 0;

      // Business performance metrics
      const totalOrders = orders?.length || 0;
      const successfulOrders = orders?.filter(o => o.status === "delivered").length || 0;
      const cancelledOrders = orders?.filter(o => o.status === "cancelled").length || 0;
      const returnedOrders = returns?.filter(r => r.status === "approved").length || 0;

      const fulfillmentRate = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0;
      const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
      const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;

      // Calculate component scores
      const productQualityScore = (
        (organicPercentage * 0.25) +
        (allergenSafety * 0.25) +
        (ingredientQuality * 0.25) +
        (Math.min(totalCertifications * 5, 100) * 0.25)
      );

      const businessPerformanceScore = (
        (fulfillmentRate * 0.4) +
        (Math.max(0, 100 - cancellationRate * 5) * 0.3) +
        (Math.max(0, 100 - returnRate * 5) * 0.3)
      );

      const customerSatisfactionScore = (
        (fulfillmentRate * 0.5) +
        (Math.max(0, 100 - returnRate * 10) * 0.5)
      );

      const certificationScore = Math.min((certifiedProducts / Math.max(totalProducts, 1)) * 100, 100);

      // Overall score - weighted average
      const overallScore = (
        (productQualityScore * 0.35) +
        (businessPerformanceScore * 0.35) +
        (customerSatisfactionScore * 0.2) +
        (certificationScore * 0.1)
      );

      setMetrics({
        overallScore: Math.round(overallScore),
        productQualityScore: Math.round(productQualityScore),
        businessPerformanceScore: Math.round(businessPerformanceScore),
        customerSatisfactionScore: Math.round(customerSatisfactionScore),
        certificationScore: Math.round(certificationScore),
        ingredientQuality: Math.round(ingredientQuality),
        allergenSafety: Math.round(allergenSafety),
        organicPercentage: Math.round(organicPercentage),
        certificationCount: totalCertifications,
        fulfillmentRate: Math.round(fulfillmentRate),
        returnRate: Math.round(returnRate),
        cancellationRate: Math.round(cancellationRate),
        responseTime: 24, // Default - could be calculated from actual data
        totalProducts,
        activeProducts,
        organicProducts,
        certifiedProducts,
        lowAllergenProducts,
      });

    } catch (error) {
      console.error("Error calculating health score:", error);
      toast({
        title: "Error",
        description: "Failed to calculate health metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [sellerId, toast]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Overall Seller Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl font-bold">
              <span className={getScoreColor(metrics.overallScore)}>
                {metrics.overallScore}
              </span>
              <span className="text-2xl text-muted-foreground">/100</span>
            </div>
            <Badge variant={getScoreBadgeVariant(metrics.overallScore)} className="text-lg px-3 py-1">
              {metrics.overallScore >= 80 ? "Excellent" : 
               metrics.overallScore >= 60 ? "Good" : "Needs Improvement"}
            </Badge>
          </div>
          <Progress value={metrics.overallScore} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            Based on product quality, business performance, and customer satisfaction
          </p>
        </CardContent>
      </Card>

      {/* Component Scores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Quality</CardTitle>
            <Leaf className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.productQualityScore}</div>
            <Progress value={metrics.productQualityScore} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Ingredients, certifications, organic
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Business Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.businessPerformanceScore}</div>
            <Progress value={metrics.businessPerformanceScore} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Orders, fulfillment, returns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
            <Heart className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.customerSatisfactionScore}</div>
            <Progress value={metrics.customerSatisfactionScore} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Delivery success, low returns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certifications</CardTitle>
            <Award className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.certificationScore}</div>
            <Progress value={metrics.certificationScore} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.certificationCount} total certifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Quality Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Product Quality Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="h-4 w-4 text-green-600" />
                <span className="text-sm">Organic Products</span>
              </div>
              <div className="text-right">
                <p className="font-semibold">{metrics.organicProducts}/{metrics.totalProducts}</p>
                <p className="text-xs text-muted-foreground">{metrics.organicPercentage}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Low Allergen Products</span>
              </div>
              <div className="text-right">
                <p className="font-semibold">{metrics.lowAllergenProducts}/{metrics.totalProducts}</p>
                <p className="text-xs text-muted-foreground">{metrics.allergenSafety}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Certified Products</span>
              </div>
              <div className="text-right">
                <p className="font-semibold">{metrics.certifiedProducts}/{metrics.totalProducts}</p>
                <p className="text-xs text-muted-foreground">{metrics.certificationCount} total certs</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Ingredient Quality</span>
              </div>
              <div className="text-right">
                <p className="font-semibold">{metrics.ingredientQuality}%</p>
                <p className="text-xs text-muted-foreground">Rich ingredients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Performance Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Business Performance Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Fulfillment Rate</span>
              </div>
              <div className="text-right">
                <p className="font-semibold">{metrics.fulfillmentRate}%</p>
                <p className="text-xs text-muted-foreground">Orders delivered</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm">Cancellation Rate</span>
              </div>
              <div className="text-right">
                <p className="font-semibold">{metrics.cancellationRate}%</p>
                <p className="text-xs text-muted-foreground">Orders cancelled</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Return Rate</span>
              </div>
              <div className="text-right">
                <p className="font-semibold">{metrics.returnRate}%</p>
                <p className="text-xs text-muted-foreground">Orders returned</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Response Time</span>
              </div>
              <div className="text-right">
                <p className="font-semibold">{metrics.responseTime}h</p>
                <p className="text-xs text-muted-foreground">Average response</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Improvement Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {metrics.organicPercentage < 30 && (
              <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <Leaf className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">Increase Organic Products</p>
                  <p className="text-xs text-green-700">Consider adding more organic options to improve quality score</p>
                </div>
              </div>
            )}
            
            {metrics.certificationScore < 50 && (
              <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Award className="h-4 w-4 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-800">Get More Certifications</p>
                  <p className="text-xs text-purple-700">Food safety and quality certifications boost trust</p>
                </div>
              </div>
            )}
            
            {metrics.returnRate > 10 && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <TrendingDown className="h-4 w-4 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Reduce Return Rate</p>
                  <p className="text-xs text-orange-700">Review product descriptions and quality to reduce returns</p>
                </div>
              </div>
            )}
            
            {metrics.fulfillmentRate < 90 && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Improve Fulfillment</p>
                  <p className="text-xs text-blue-700">Focus on timely order processing and delivery</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}