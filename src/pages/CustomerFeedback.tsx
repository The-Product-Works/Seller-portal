import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp, TrendingDown, MessageSquare, Filter } from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductReview {
  review_id: string;
  listing_id: string;
  rating: number;
  review_title: string;
  review_text: string;
  created_at: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  product_title: string;
  buyer_name: string;
}

interface FeedbackStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
  verifiedPurchases: number;
  recentTrend: 'up' | 'down' | 'stable';
}

export default function CustomerFeedback() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: {},
    verifiedPurchases: 0,
    recentTrend: 'stable'
  });
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const { toast } = useToast();

  useEffect(() => {
    loadCustomerFeedback();
  }, [filterRating, sortBy, loadCustomerFeedback]);

  const loadCustomerFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) {
        toast({
          title: "Authentication Error",
          description: "Please log in to view feedback",
          variant: "destructive",
        });
        return;
      }

      // Get reviews for seller's products
      let query = supabase
        .from("product_reviews")
        .select(`
          review_id,
          listing_id,
          rating,
          review_title,
          review_text,
          created_at,
          is_verified_purchase,
          helpful_count,
          seller_product_listings!inner(
            seller_title,
            seller_id
          )
        `)
        .eq("seller_product_listings.seller_id", sellerId)
        .eq("status", "approved");

      // Apply rating filter
      if (filterRating !== "all") {
        query = query.eq("rating", parseInt(filterRating));
      }

      // Apply sorting
      if (sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      } else if (sortBy === "oldest") {
        query = query.order("created_at", { ascending: true });
      } else if (sortBy === "highest_rated") {
        query = query.order("rating", { ascending: false });
      } else if (sortBy === "lowest_rated") {
        query = query.order("rating", { ascending: true });
      } else if (sortBy === "most_helpful") {
        query = query.order("helpful_count", { ascending: false });
      }

      const { data: reviewsData, error } = await query;

      if (error) {
        console.error("Error fetching reviews:", error);
        toast({
          title: "Error",
          description: "Failed to load customer feedback",
          variant: "destructive",
        });
        return;
      }

      // Transform data
      const formattedReviews: ProductReview[] = (reviewsData || []).map((review) => ({
        review_id: review.review_id,
        listing_id: review.listing_id,
        rating: review.rating,
        review_title: review.review_title || "",
        review_text: review.review_text || "",
        created_at: review.created_at,
        is_verified_purchase: review.is_verified_purchase || false,
        helpful_count: review.helpful_count || 0,
        product_title: review.seller_product_listings?.seller_title || "Unknown Product",
        buyer_name: "Anonymous" // Privacy protection
      }));

      setReviews(formattedReviews);

      // Calculate statistics
      const totalReviews = formattedReviews.length;
      const averageRating = totalReviews > 0 
        ? formattedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0;

      const ratingDistribution: { [key: number]: number } = {};
      for (let i = 1; i <= 5; i++) {
        ratingDistribution[i] = formattedReviews.filter(r => r.rating === i).length;
      }

      const verifiedPurchases = formattedReviews.filter(r => r.is_verified_purchase).length;

      // Calculate trend (simplified)
      const recentReviews = formattedReviews.filter(r => 
        new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      const olderReviews = formattedReviews.filter(r => 
        new Date(r.created_at) <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      const recentAvg = recentReviews.length > 0 
        ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length 
        : 0;
      const olderAvg = olderReviews.length > 0 
        ? olderReviews.reduce((sum, r) => sum + r.rating, 0) / olderReviews.length 
        : 0;

      let recentTrend: 'up' | 'down' | 'stable' = 'stable';
      if (recentAvg > olderAvg + 0.2) recentTrend = 'up';
      else if (recentAvg < olderAvg - 0.2) recentTrend = 'down';

      setStats({
        totalReviews,
        averageRating,
        ratingDistribution,
        verifiedPurchases,
        recentTrend
      });

    } catch (error) {
      console.error("Error loading feedback:", error);
      toast({
        title: "Error",
        description: "Failed to load customer feedback",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterRating, sortBy, toast]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Feedback</h1>
        <div className="flex gap-4">
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest_rated">Highest Rated</SelectItem>
              <SelectItem value="lowest_rated">Lowest Rated</SelectItem>
              <SelectItem value="most_helpful">Most Helpful</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReviews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
            <div className="flex mt-1">
              {renderStars(Math.round(stats.averageRating))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Purchases</CardTitle>
            <Badge variant="secondary">{stats.verifiedPurchases}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalReviews > 0 ? Math.round((stats.verifiedPurchases / stats.totalReviews) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">of total reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Trend</CardTitle>
            {stats.recentTrend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : stats.recentTrend === 'down' ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : (
              <div className="h-4 w-4 rounded-full bg-gray-400"></div>
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              stats.recentTrend === 'up' ? 'text-green-600' : 
              stats.recentTrend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {stats.recentTrend === 'up' ? '↗' : stats.recentTrend === 'down' ? '↘' : '→'}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingDistribution[rating] || 0;
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`bg-yellow-400 h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground w-12">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No reviews yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your customer reviews will appear here once you receive them.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.review_id} className="border-b pb-6 last:border-b-0">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {renderStars(review.rating)}
                        {review.is_verified_purchase && (
                          <Badge variant="secondary" className="text-xs">Verified Purchase</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Product: {review.product_title}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(review.created_at)}
                      </p>
                      {review.helpful_count > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {review.helpful_count} found helpful
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {review.review_title && (
                    <h4 className="font-medium mb-2">{review.review_title}</h4>
                  )}
                  
                  {review.review_text && (
                    <p className="text-gray-700 leading-relaxed">{review.review_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}