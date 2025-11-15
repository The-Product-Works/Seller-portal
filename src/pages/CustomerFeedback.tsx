import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, TrendingUp, TrendingDown, MessageSquare, Filter, Send, Mail, Phone, MessageCircle } from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  product_category: string;
  product_price: number;
  product_image?: string;
  buyer_name: string;
}

interface FeedbackStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
  verifiedPurchases: number;
  recentTrend: 'up' | 'down' | 'stable';
}

interface AdminQuestion {
  id: string;
  question: string;
  answer?: string;
  product_name: string;
  created_at: string;
  status: 'pending' | 'answered';
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
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [adminQuestions, setAdminQuestions] = useState<AdminQuestion[]>([]);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [products, setProducts] = useState<Array<{listing_id: string; seller_title: string}>>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadCustomerFeedback();
    loadAdminQuestions();
    loadSellerProducts();
  }, [filterRating, sortBy]);

  const loadSellerProducts = useCallback(async () => {
    try {
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) return;

      const { data, error } = await supabase
        .from("seller_product_listings")
        .select("listing_id, seller_title")
        .eq("seller_id", sellerId)
        .eq("status", "active");

      if (!error && data) {
        setProducts(data);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
  }, []);

  const loadAdminQuestions = useCallback(async () => {
    try {
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) return;

      // Mock data for admin questions - replace with real API call when table is created
      setAdminQuestions([
        {
          id: '1',
          question: 'What is the warranty period for this product?',
          answer: 'This product comes with a 1-year warranty from the date of purchase.',
          product_name: 'Sample Product 1',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'answered'
        }
      ]);
    } catch (error) {
      console.error("Error loading admin questions:", error);
    }
  }, []);

  const handleAskAdmin = async () => {
    if (!newQuestion.trim() || !selectedProduct) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const newQ: AdminQuestion = {
        id: Date.now().toString(),
        question: newQuestion,
        product_name: products.find(p => p.listing_id === selectedProduct)?.seller_title || "Unknown",
        created_at: new Date().toISOString(),
        status: 'pending',
      };
      
      setAdminQuestions(prev => [newQ, ...prev]);
      setNewQuestion("");
      toast({
        title: "Question Sent",
        description: "Admin will respond to your question shortly",
      });
    } catch (error) {
      console.error("Error asking admin:", error);
      toast({
        title: "Error",
        description: "Failed to send question",
        variant: "destructive",
      });
    }
  };

  const handleContactAdmin = async () => {
    if (!contactSubject.trim() || !contactMessage.trim()) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Mock send - replace with real API call
      toast({
        title: "Message Sent",
        description: "Admin will respond to your message soon",
      });
      setContactSubject("");
      setContactMessage("");
      setShowContactDialog(false);
    } catch (error) {
      console.error("Error contacting admin:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

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
            seller_id,
            category,
            price,
            listing_images(image_url)
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
        product_category: review.seller_product_listings?.category || "General",
        product_price: review.seller_product_listings?.price || 0,
        product_image: review.seller_product_listings?.listing_images?.[0]?.image_url,
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Customer Feedback Center</h1>
          <p className="text-gray-600 mt-1">Manage reviews, questions, and communicate with customers</p>
        </div>
        <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Mail className="h-4 w-4" />
              Contact Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contact Admin</DialogTitle>
              <DialogDescription>Send a message to our support team</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Enter subject"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your message"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowContactDialog(false)}>Cancel</Button>
                <Button onClick={handleContactAdmin}>Send Message</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="reviews" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reviews">Customer Reviews</TabsTrigger>
          <TabsTrigger value="questions">Q&A with Admin</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-6">
          <div className="flex gap-4 flex-wrap">
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
            
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.listing_id} value={p.listing_id}>
                    {p.seller_title}
                  </SelectItem>
                ))}
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

          {/* Reviews List */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const filteredReviews = reviews.filter(review => {
                  if (filterProduct !== "all" && review.listing_id !== filterProduct) {
                    return false;
                  }
                  return true;
                });

                return filteredReviews.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No reviews yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Your customer reviews will appear here once you receive them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredReviews.map((review) => (
                      <div key={review.review_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                        {/* Product Info Header */}
                        <div className="flex gap-4 mb-4">
                          {review.product_image && (
                            <div className="flex-shrink-0">
                              <img 
                                src={review.product_image} 
                                alt={review.product_title}
                                className="w-20 h-20 object-cover rounded-lg border"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 mb-1">
                              {review.product_title}
                            </h3>
                            <div className="flex flex-wrap gap-2 items-center mb-2">
                              <Badge variant="outline" className="text-xs">
                                {review.product_category}
                              </Badge>
                              <span className="text-sm font-semibold text-blue-600">
                                ₹{review.product_price?.toFixed(0) || "0"}
                              </span>
                              {review.is_verified_purchase && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                  ✓ Verified Purchase
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {renderStars(review.rating)}
                              <span className="text-sm text-gray-600">({review.rating} stars)</span>
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            {formatDate(review.created_at)}
                          </div>
                        </div>

                        {/* Review Content */}
                        <div className="bg-gray-50 rounded p-3">
                          {review.review_title && (
                            <h4 className="font-semibold text-gray-900 mb-2">{review.review_title}</h4>
                          )}
                          
                          {review.review_text && (
                            <p className="text-gray-700 text-sm leading-relaxed mb-2">{review.review_text}</p>
                          )}
                        </div>

                        {/* Footer Stats */}
                        <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                          <span>Customer: {review.buyer_name}</span>
                          {review.helpful_count > 0 && (
                            <span>👍 {review.helpful_count} found helpful</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          {/* Ask Admin Question Section */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                Ask Admin a Question
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="product-select">Select Product (Optional)</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product to ask about" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.listing_id} value={p.listing_id}>
                        {p.seller_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="question-input">Your Question</Label>
                <Textarea
                  id="question-input"
                  placeholder="Ask any question related to your business or products..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleAskAdmin} className="gap-2">
                <Send className="h-4 w-4" />
                Ask Admin
              </Button>
            </CardContent>
          </Card>

          {/* Admin Responses */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Q&A History</CardTitle>
            </CardHeader>
            <CardContent>
              {adminQuestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No questions asked yet. Ask the admin anything about your business!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {adminQuestions.map((q) => (
                    <div key={q.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{q.product_name}</p>
                          <Badge variant={q.status === 'answered' ? 'secondary' : 'outline'} className="mt-1">
                            {q.status === 'answered' ? '✓ Answered' : 'Pending'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(q.created_at)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-900"><strong>Q:</strong> {q.question}</p>
                      </div>
                      {q.answer && (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                          <p className="text-sm text-blue-900"><strong>Admin Response:</strong> {q.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
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
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(Math.max(percentage, 5), 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-muted-foreground w-12">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}