import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Star, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-protimart.jpg";

interface GlobalProduct {
  global_product_id: string;
  product_name: string;
  slug: string;
  lowest_price: number | null;
  highest_price: number | null;
  avg_rating_across_sellers: number | null;
  avg_health_score: number | null;
  total_listings_count: number;
  is_active: boolean;
}

export default function Landing() {
  const [products, setProducts] = useState<GlobalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadProducts();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth/signin");
    }
  };

  const loadProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("global_products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(16);

    if (error) console.error("Error loading global products:", error);
    if (data) setProducts(data);

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <div className="relative h-[500px] mt-16">
        <img 
          src={heroImage} 
          alt="ProtiMart Hero" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-5xl font-bold text-white mb-4">
              Welcome to <span className="gradient-text">ProtiMart</span>
            </h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Shop verified products from multiple sellers at the best prices
            </p>
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-2 mb-8">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold gradient-text">Featured Products</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card 
                key={product.global_product_id}
                className="group hover:shadow-pink transition cursor-pointer"
                onClick={() => navigate(`/product/${product.slug}`)}
              >
                {/* Product Image Placeholder */}
                <div className="h-48 bg-muted flex items-center justify-center rounded-t-lg">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground" />
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                    {product.product_name}
                  </h3>

                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                      ₹{product.lowest_price ?? "N/A"}
                    </span>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{product.avg_rating_across_sellers ?? "4.5"}</span>
                    </div>
                  </div>

                  {product.total_listings_count > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {product.total_listings_count} sellers • Best price available
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
