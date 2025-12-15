import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, TrendingUp, TrendingDown, MessageSquare, Filter, Send, Mail, Phone, MessageCircle, Flag } from "lucide-react";
import { SellerRaiseDispute } from "@/components/SellerRaiseDispute";
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
  buyer_id: string;
  rating: number;
  review_title: string | null;
  review_text: string | null;
  created_at: string;
  is_verified_purchase: boolean | null;
  helpful_count: number | null;
  not_helpful_count: number | null;
  status: string | null;
  moderation_notes: string | null;
  updated_at: string;
  images: string[] | null;
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

interface BuyerQuestion {
  question_id: string;
  listing_id: string;
  buyer_id: string;
  question_text: string;
  is_active: boolean;
  created_at: string;
  product_name: string;
  buyer_name: string;
  answers?: Array<{
    answer_id: string;
    answer_text: string;
    is_verified_seller: boolean;
    created_at: string;
    helpful_count: number;
    not_helpful_count: number;
  }>;
}

interface AdminQuestion {
  id: string;
  question: string;
  answer?: string;
  product_name: string;
  created_at: string;
  status: 'pending' | 'answered';
}

interface AdminDetails {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export default function CustomerFeedback() {
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [buyerQuestions, setBuyerQuestions] = useState<BuyerQuestion[]>([]);
  const [adminQuestions, setAdminQuestions] = useState<AdminQuestion[]>([]);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [products, setProducts] = useState<Array<{listing_id: string; seller_title: string}>>([]);
  const [raiseDisputeOpen, setRaiseDisputeOpen] = useState(false);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [adminDetails, setAdminDetails] = useState<AdminDetails | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [activeTab, setActiveTab] = useState("reviews");
  const [stats, setStats] = useState<FeedbackStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: {},
    verifiedPurchases: 0,
    recentTrend: 'stable'
  });
  const { toast } = useToast();

  useEffect(() => {
    const initializeData = async () => {
      try {
        const id = await getAuthenticatedSellerId();
        setSellerId(id);

        // Load basic data first
        await Promise.allSettled([
          loadSellerProducts(),
          loadAdminDetails()
        ]);

        // Load reviews and questions separately
        await loadCustomerFeedback();
        await loadBuyerQuestions();

        setLoading(false);
      } catch (error) {
        console.error("Error initializing customer feedback data:", error);
        setLoading(false);
      }
    };

    initializeData();
  }, []); // Functions are memoized with useCallback, no need for dependencies
  const filteredReviews = useMemo(() => {
    const filtered = reviews.filter(review => {
      // Rating filter
      if (filterRating !== "all" && (review.rating || 0) !== parseInt(filterRating)) {
        return false;
      }
      
      // Status filter
      if (filterStatus !== "all" && (review.status || "") !== filterStatus) {
        return false;
      }
      
      // Product filter
      if (filterProduct !== "all" && review.listing_id !== filterProduct) {
        return false;
      }
      
      // Search filter
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const matchesTitle = review.review_title?.toLowerCase().includes(search);
        const matchesText = review.review_text?.toLowerCase().includes(search);
        const matchesProduct = review.product_title?.toLowerCase().includes(search);
        if (!matchesTitle && !matchesText && !matchesProduct) {
          return false;
        }
      }
      
      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'oldest':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'highest_rated':
          return (b.rating || 0) - (a.rating || 0);
        case 'lowest_rated':
          return (a.rating || 0) - (b.rating || 0);
        case 'most_helpful':
          return (b.helpful_count || 0) - (a.helpful_count || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [reviews, filterRating, filterStatus, filterProduct, searchTerm, sortBy]);

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

  const loadBuyerQuestions = useCallback(async () => {
    try {
      const sellerId = await getAuthenticatedSellerId();
      console.log('Loading buyer questions for seller:', sellerId);
      
      if (!sellerId) {
        console.log('No seller ID found, cannot load questions');
        setBuyerQuestions([]);
        return;
      }

      // First get seller's listings
      const { data: listings } = await supabase
        .from("seller_product_listings")
        .select("listing_id, seller_title")
        .eq("seller_id", sellerId);

      if (!listings || listings.length === 0) {
        setBuyerQuestions([]);
        return;
      }

      const listingIds = listings.map(l => l.listing_id);

      // Query product_questions for buyer questions on seller's products
      const { data: questionsData, error } = await supabase
        .from("product_questions")
        .select(`
          question_id,
          listing_id,
          buyer_id,
          question_text,
          is_active,
          created_at,
          users!product_questions_buyer_id_fkey(email)
        `)
        .in("listing_id", listingIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      console.log('Buyer questions query result:', { data: questionsData, error });

      if (!error && questionsData) {
        // For each question, get its answers
        const questionsWithAnswers = await Promise.all(
          questionsData.map(async (q) => {
            const listing = listings.find(l => l.listing_id === q.listing_id);
            
            // Get answers for this question
            const { data: answers } = await supabase
              .from("product_answers")
              .select(`
                answer_id,
                answer_text,
                is_verified_seller,
                helpful_count,
                not_helpful_count,
                created_at
              `)
              .eq("question_id", q.question_id)
              .eq("is_active", true)
              .order("created_at", { ascending: false });

            return {
              question_id: q.question_id,
              listing_id: q.listing_id,
              buyer_id: q.buyer_id,
              question_text: q.question_text,
              is_active: q.is_active,
              created_at: q.created_at,
              product_name: listing?.seller_title || "Unknown Product",
              buyer_name: q.users?.email?.split('@')[0] || "Anonymous",
              answers: answers || []
            };
          })
        );

        console.log('Formatted buyer questions:', questionsWithAnswers);
        setBuyerQuestions(questionsWithAnswers);
      } else {
        console.log("Error loading buyer questions:", error);
        setBuyerQuestions([]);
      }
    } catch (error) {
      console.error("Error loading buyer questions:", error);
      setBuyerQuestions([]);
    }
  }, []);

  const loadAdminDetails = useCallback(async () => {
    try {
      // Query users with admin role by joining user_roles and roles tables
      const { data: adminData, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          roles!inner(role_name),
          users!inner(email, phone)
        `)
        .eq("roles.role_name", "admin")
        .limit(1)
        .single();

      if (!error && adminData) {
        // Get user profile separately
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("full_name")
          .eq("user_id", adminData.user_id)
          .single();

        setAdminDetails({
          user_id: adminData.user_id,
          name: profileData?.full_name || "Admin Support",
          email: adminData.users?.email || "",
          phone: adminData.users?.phone || "",
          role: adminData.roles?.role_name || "admin"
        });
      } else {
        console.log("No admin found or error:", error);
        // Fallback to mock data
        setAdminDetails({
          user_id: 'mock-admin',
          name: 'Admin Support',
          email: 'admin@theproductworks.com',
          phone: '+91-9876543210',
          role: 'admin'
        });
      }
    } catch (error) {
      console.error("Error loading admin details:", error);
      // Fallback to mock data
      setAdminDetails({
        user_id: 'mock-admin',
        name: 'Admin Support',
        email: 'admin@theproductworks.com',
        phone: '+91-9876543210',
        role: 'admin'
      });
    }
  }, []);

  const handleAskAdmin = async () => {
    if (!newQuestion.trim()) {
      toast({
        title: "Error",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    try {
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) {
        toast({
          title: "Error",
          description: "Please log in to ask questions",
          variant: "destructive",
        });
        return;
      }

      // Insert into seller_admin_questions table
      const { data, error } = await supabase
        .from("seller_admin_questions")
        .insert({
          seller_id: sellerId,
          listing_id: selectedProduct || null,
          question_text: newQuestion.trim(),
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting question:", error);
        toast({
          title: "Error",
          description: "Failed to send question. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Add to local state for immediate UI update
      const newQ: AdminQuestion = {
        id: data.question_id,
        question: data.question_text,
        answer: null,
        product_name: selectedProduct ? products.find(p => p.listing_id === selectedProduct)?.seller_title || "Unknown" : "General",
        created_at: data.created_at,
        status: 'pending',
      };

      setAdminQuestions(prev => [newQ, ...prev]);
      setNewQuestion("");
      setSelectedProduct("");

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

  const handleAnswerBuyerQuestion = async (questionId: string, answerText: string) => {
    if (!answerText.trim()) {
      toast({
        title: "Error",
        description: "Please enter an answer",
        variant: "destructive",
      });
      return;
    }

    try {
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) {
        toast({
          title: "Error",
          description: "Please log in to answer questions",
          variant: "destructive",
        });
        return;
      }

      // Insert answer into product_answers table
      const { error } = await supabase
        .from("product_answers")
        .insert({
          question_id: questionId,
          seller_id: sellerId,
          answer_text: answerText.trim(),
          is_verified_seller: true,
          is_active: true,
          helpful_count: 0,
          not_helpful_count: 0
        });

      if (error) {
        console.error("Error inserting answer:", error);
        toast({
          title: "Error",
          description: "Failed to submit answer. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Reload buyer questions to show the new answer
      await loadBuyerQuestions();

      toast({
        title: "Answer Submitted",
        description: "Your answer has been posted successfully",
      });
    } catch (error) {
      console.error("Error answering question:", error);
      toast({
        title: "Error",
        description: "Failed to submit answer",
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
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) {
        toast({
          title: "Error",
          description: "Please log in to send messages",
          variant: "destructive",
        });
        return;
      }

      if (!adminDetails?.user_id) {
        toast({
          title: "Error",
          description: "Admin contact information not available",
          variant: "destructive",
        });
        return;
      }

      // Insert into messages table
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: sellerId,
          receiver_id: adminDetails.user_id,
          subject: contactSubject.trim(),
          message_text: contactMessage.trim(),
          message_type: 'direct'
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
        return;
      }

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
    setReviewsLoading(true);
    try {
      const sellerId = await getAuthenticatedSellerId();
      console.log("Authenticated seller ID:", sellerId); // Debug log

      if (!sellerId) {
        toast({
          title: "Authentication Error",
          description: "Please log in to view feedback",
          variant: "destructive",
        });
        return;
      }

      // First, check what listings this seller has
      const { data: sellerListings, error: listingsError } = await supabase
        .from("seller_product_listings")
        .select("listing_id, seller_title, base_price, discounted_price")
        .eq("seller_id", sellerId)
        .eq("status", "active");

      console.log("🔍 Seller listings query result:", { sellerListings, listingsError });
      console.log("📊 Seller ID being used:", sellerId);
      console.log("🏪 Found", sellerListings?.length || 0, "listings for seller");

      if (listingsError) {
        console.error("❌ Error fetching seller listings:", listingsError);
        toast({
          title: "Error",
          description: "Failed to load product listings",
          variant: "destructive",
        });
        return;
      }

      // Get reviews for seller's products
      let reviewsData: Array<{
        review_id: string;
        listing_id: string;
        buyer_id: string;
        rating: number;
        review_title: string | null;
        review_text: string | null;
        created_at: string;
        is_verified_purchase: boolean | null;
        helpful_count: number | null;
        not_helpful_count: number | null;
        status: string | null;
        moderation_notes: string | null;
        updated_at: string | null;
        images: string[] | null;
      }> = [];
      let error: Error | null = null;

      if (sellerListings && sellerListings.length > 0) {
        // If seller has listings, get reviews for those listings
        const listingIds = sellerListings.map(l => l.listing_id);
        console.log("🔗 Listing IDs to search for reviews:", listingIds);

        const { data: reviews, error: reviewsError } = await supabase
          .from("product_reviews")
          .select(`
            review_id,
            listing_id,
            buyer_id,
            rating,
            review_title,
            review_text,
            created_at,
            is_verified_purchase,
            helpful_count,
            not_helpful_count,
            status,
            moderation_notes,
            updated_at,
            images
          `)
          .in("listing_id", listingIds)
          .eq("status", "approved");

        reviewsData = reviews || [];
        error = reviewsError;

        console.log("📝 Reviews query result:", { reviews: reviewsData, error: reviewsError });
        console.log("⭐ Found", reviewsData.length, "reviews for seller's listings");

        // Images are already included in the product_reviews table
        console.log("🖼️ Images loaded directly from product_reviews table");
      } else {
        console.log("⚠️ Seller has no listings, no reviews to show");
        reviewsData = [];
      }

      // Transform data and add product information
      const formattedReviews: ProductReview[] = reviewsData.map((review) => {
        const product = sellerListings?.find(l => l.listing_id === review.listing_id);

        return {
          review_id: review.review_id,
          listing_id: review.listing_id,
          buyer_id: review.buyer_id,
          rating: review.rating,
          review_title: review.review_title || "",
          review_text: review.review_text || "",
          created_at: review.created_at,
          is_verified_purchase: review.is_verified_purchase || false,
          helpful_count: review.helpful_count || 0,
          not_helpful_count: review.not_helpful_count || 0,
          status: review.status || "pending",
          moderation_notes: review.moderation_notes,
          updated_at: review.updated_at,
          images: review.images,
          product_title: product?.seller_title || "Unknown Product",
          product_category: "Product",
          product_price: product?.discounted_price || product?.base_price || 0,
          product_image: null, // We don't have images in the listings query
          buyer_name: "Anonymous" // Privacy protection
        };
      });

      setReviews(formattedReviews);

      // Calculate statistics
      calculateAnalytics(formattedReviews);

    } catch (error) {
      console.error("Error loading feedback:", error);
      toast({
        title: "Error",
        description: "Failed to load customer feedback",
        variant: "destructive",
      });
    } finally {
      setReviewsLoading(false);
    }
  }, [toast]);

  const calculateAnalytics = useCallback((reviewsData: ProductReview[]) => {
    setAnalyticsLoading(true);
    try {
      const totalReviews = reviewsData.length;
      const averageRating = totalReviews > 0
        ? reviewsData.reduce((sum, review) => sum + (review.rating || 0), 0) / totalReviews
        : 0;

      const ratingDistribution: { [key: number]: number } = {};
      for (let i = 1; i <= 5; i++) {
        ratingDistribution[i] = reviewsData.filter(r => (r.rating || 0) === i).length;
      }

      const verifiedPurchases = reviewsData.filter(r => r.is_verified_purchase).length;

      // Calculate trend (simplified)
      const recentReviews = reviewsData.filter(r =>
        new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      const olderReviews = reviewsData.filter(r =>
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
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

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
    <>
      <SellerRaiseDispute
        isOpen={raiseDisputeOpen}
        onClose={() => setRaiseDisputeOpen(false)}
        sellerId={sellerId || ""}
        context={{
          type: "platform",
        }}
      />
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-yellow-50/20 via-transparent to-blue-50/20 pointer-events-none"></div>
      <div className="fixed inset-0 pattern-dots opacity-[0.02] pointer-events-none"></div>
      
      <div className="container mx-auto p-6 space-y-6 relative z-10">
        <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-yellow-50 to-blue-50 -mx-6 px-6 py-6 border-b-2 border-yellow-200/50">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">Customer Feedback Center</h1>
            <p className="text-gray-600 mt-1">Manage reviews, questions, and communicate with customers</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setRaiseDisputeOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Flag className="h-4 w-4" />
              Raise Dispute
            </Button>
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
                {adminDetails && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Admin Contact Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Name:</span>
                        <span>{adminDetails.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Email:</span>
                        <a href={`mailto:${adminDetails.email}`} className="text-blue-600 hover:underline">
                          {adminDetails.email}
                        </a>
                      </div>
                      {adminDetails.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Phone:</span>
                          <a href={`tel:${adminDetails.phone}`} className="text-blue-600 hover:underline">
                            {adminDetails.phone}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Role:</span>
                        <span className="capitalize">{adminDetails.role}</span>
                      </div>
                    </div>
                  </div>
                )}
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
        </div>

      {/* Simple Tab Navigation */}
      <div className="w-full mb-6">
        <div className="flex space-x-1 border-b border-gray-200">
          <button
            onClick={() => {
              console.log('Reviews tab clicked');
              setActiveTab('reviews');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'reviews'
                ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Customer Reviews
          </button>
          <button
            onClick={() => {
              setActiveTab('buyer-questions');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'buyer-questions'
                ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Buyer Questions ({buyerQuestions.length})
          </button>
          <button
            onClick={() => {
              console.log('Q&A tab clicked, setting activeTab to questions');
              setActiveTab('questions');
              console.log('activeTab should now be questions');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'questions'
                ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Q&A with Admin
          </button>
          <button
            onClick={() => {
              console.log('Analytics tab clicked');
              setActiveTab('analytics');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'analytics'
                ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Analytics
          </button>
        </div>
        {/* Debug current tab */}
        <div className="mt-2 text-xs text-gray-500">
          Current active tab: {activeTab}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="text-xs text-blue-600 mb-2">📊 Reviews Tab Content</div>
            {/* Reviews content */}
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search reviews by title, content, or product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
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
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
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
              {filteredReviews.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No reviews yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Your customer reviews will appear here once you receive them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredReviews.map((review) => {
                      return (
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
                              <Badge variant={(review.status || 'pending') === 'approved' ? 'default' : (review.status || 'pending') === 'pending' ? 'secondary' : 'destructive'} className="text-xs">
                                {review.status || 'pending'}
                              </Badge>
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
                        <div className="bg-gray-50 rounded p-4 space-y-3">
                          {/* Review Header with Listing ID */}
                          <div className="flex justify-between items-start">
                            <div className="text-xs text-gray-500">
                              <strong>Listing ID:</strong> {review.listing_id}
                            </div>
                            <div className="text-xs text-gray-500">
                              <strong>Review ID:</strong> {review.review_id}
                            </div>
                          </div>

                          {/* Review Title */}
                          {review.review_title && review.review_title.trim() && (
                            <h4 className="font-semibold text-gray-900 text-lg">{review.review_title}</h4>
                          )}

                          {/* Review Text */}
                          {review.review_text && review.review_text.trim() && (
                            <p className="text-gray-700 text-sm leading-relaxed">{review.review_text}</p>
                          )}

                          {/* If no title or text, show a placeholder */}
                          {(!review.review_title || !review.review_title.trim()) && (!review.review_text || !review.review_text.trim()) && (
                            <div className="text-center py-4 text-gray-500">
                              <p className="text-sm">This review has no content.</p>
                              <p className="text-xs mt-1">Rating: {review.rating} stars</p>
                            </div>
                          )}

                          {/* Review Images */}
                          {review.images && review.images.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-600 mb-2">Review Images:</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {review.images.map((imageUrl, index) => (
                                  <div key={index} className="relative">
                                    <img
                                      src={imageUrl}
                                      alt={`Review image ${index + 1}`}
                                      className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => window.open(imageUrl, '_blank')}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Helpful/Not Helpful Counts */}
                          <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-green-600">👍</span>
                              <span className="font-medium">{review.helpful_count || 0}</span>
                              <span className="text-gray-600">helpful</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-red-600">👎</span>
                              <span className="font-medium">{review.not_helpful_count || 0}</span>
                              <span className="text-gray-600">not helpful</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer Stats */}
                        <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                          <span>Customer: {review.buyer_name}</span>
                          <div className="text-xs text-gray-500">
                            Status: <Badge variant={(review.status || 'pending') === 'approved' ? 'default' : (review.status || 'pending') === 'pending' ? 'secondary' : 'destructive'} className="text-xs ml-1">
                              {review.status || 'pending'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )
              }
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'buyer-questions' && (
        <div className="space-y-6">
          <div className="text-xs text-purple-600 mb-2">💬 Buyer Questions - Answer customer inquiries</div>
          <Card>
            <CardHeader>
              <CardTitle>Customer Questions About Your Products</CardTitle>
              <p className="text-sm text-muted-foreground">Respond to buyer questions to improve sales and customer trust</p>
            </CardHeader>
            <CardContent>
              {buyerQuestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No buyer questions yet. When buyers ask about your products, they'll appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {buyerQuestions.map((q) => (
                    <div key={q.question_id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{q.product_name}</p>
                          <p className="text-xs text-gray-500 mt-1">Asked by: {q.buyer_name}</p>
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(q.created_at)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-900"><strong>Q:</strong> {q.question_text}</p>
                      </div>
                      
                      {/* Existing Answers */}
                      {q.answers && q.answers.length > 0 && (
                        <div className="space-y-2">
                          {q.answers.map((answer) => (
                            <div key={answer.answer_id} className={`p-3 rounded ${answer.is_verified_seller ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-sm font-medium">
                                  {answer.is_verified_seller ? '✓ Your Answer' : 'Community Answer'}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>👍 {answer.helpful_count}</span>
                                  <span>👎 {answer.not_helpful_count}</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-900">{answer.answer_text}</p>
                              <p className="text-xs text-gray-500 mt-1">{formatDate(answer.created_at)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Answer Form */}
                      {(!q.answers || !q.answers.some(a => a.is_verified_seller)) && (
                        <div className="mt-3">
                          <Label htmlFor={`answer-${q.question_id}`}>Your Answer</Label>
                          <Textarea
                            id={`answer-${q.question_id}`}
                            placeholder="Provide a helpful answer to the buyer..."
                            className="mt-1"
                          />
                          <Button
                            onClick={(e) => {
                              const textarea = document.getElementById(`answer-${q.question_id}`) as HTMLTextAreaElement;
                              if (textarea) {
                                handleAnswerBuyerQuestion(q.question_id, textarea.value);
                                textarea.value = '';
                              }
                            }}
                            className="mt-2"
                            size="sm"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Submit Answer
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="text-xs text-green-600 mb-2">💬 Q&A Tab Content - Active Tab: {activeTab}</div>
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                Ask Admin a Question
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="text-xs text-purple-600 mb-2">📈 Analytics Tab Content</div>
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
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  </>
  );
}