import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Star, Image as ImageIcon, TrendingUp, Package, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { SellerRaiseDispute } from "@/components/SellerRaiseDispute";
import { ImageViewer } from "@/components/ImageViewer";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import heroImage from "@/assets/hero-protimart.jpg";

interface SellerListing {
  listing_id: string;
  seller_title: string | null;
  seller_description: string | null;
  base_price: number;
  discounted_price: number | null;
  discount_percentage: number | null;
  status: string;
  rating: number | null;
  review_count: number;
  health_score: number | null;
  total_stock_quantity: number;
  global_products: {
    product_name: string;
    brands: {
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
  listing_images: Array<{
    image_url: string;
    is_primary: boolean;
  }>;
  listing_variants?: Array<{
    variant_id: string;
    variant_name: string;
    size: string | null;
    flavor: string | null;
    price: number;
    stock_quantity: number;
    is_available: boolean;
  }>;
}

interface Brand {
  brand_id: string;
  name: string;
}

export default function Landing() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [raiseDisputeOpen, setRaiseDisputeOpen] = useState(false);
  const [sellerId, setSellerId] = useState<string | null>(null);

  // 🔹 Filters
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");

  // Variant selection state
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Image carousel state
  const [currentImageIndexes, setCurrentImageIndexes] = useState<Record<string, number>>({});

  // Image viewer state
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<Array<{ image_url: string; is_primary?: boolean }>>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Image navigation functions
  const nextImage = (listingId: string, totalImages: number) => {
    setCurrentImageIndexes(prev => ({
      ...prev,
      [listingId]: ((prev[listingId] || 0) + 1) % totalImages
    }));
  };

  const prevImage = (listingId: string, totalImages: number) => {
    setCurrentImageIndexes(prev => ({
      ...prev,
      [listingId]: prev[listingId] === 0 ? totalImages - 1 : (prev[listingId] || 0) - 1
    }));
  };

  // Open image viewer
  const openImageViewer = (images: Array<{ image_url: string; is_primary?: boolean }>, initialIndex: number) => {
    setViewerImages(images);
    setViewerInitialIndex(initialIndex);
    setImageViewerOpen(true);
  };

  useEffect(() => {
    loadData();
    getAuthenticatedSellerId().then(id => setSellerId(id));
  }, []);

  // 🔹 Fetch all active seller listings & brands (public)
  async function loadData() {
    setLoading(true);
    try {
      const [{ data: listingsData, error: lErr }, { data: brandsData, error: bErr }] = await Promise.all([
        supabase
          .from("seller_product_listings")
          .select(
            `
            listing_id,
            seller_title,
            seller_description,
            base_price,
            discounted_price,
            discount_percentage,
            status,
            rating,
            review_count,
            health_score,
            total_stock_quantity,
            global_products (
              product_name,
              brands (
                name,
                logo_url
              )
            ),
            listing_images (
              image_url,
              is_primary
            ),
            listing_variants (
              variant_id,
              variant_name,
              size,
              flavor,
              price,
              stock_quantity,
              is_available
            )
          `
          )
          .eq("status", "active")
          .gt("total_stock_quantity", 0)
          .order("created_at", { ascending: false }),
        supabase.from("brands").select("*").eq("is_active", true).order("name", { ascending: true }),
      ]);

      if (lErr) console.error("Listings fetch error:", lErr);
      if (bErr) console.error("Brand fetch error:", bErr);

      setListings((listingsData as SellerListing[]) || []);
      setBrands(brandsData || []);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }

  // 🔹 Filter + search logic
  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const productName = listing.global_products?.product_name || "";
      const sellerTitle = listing.seller_title || "";
      const searchTerm = search.toLowerCase();
      
      const titleMatch = 
        productName.toLowerCase().includes(searchTerm) ||
        sellerTitle.toLowerCase().includes(searchTerm);

      const brandName = listing.global_products?.brands?.name || "";
      const brandMatch = filterBrand
        ? brandName.toLowerCase() === filterBrand.toLowerCase()
        : true;

      const price = listing.base_price ?? 0;
      const minOk = minPrice === "" || price >= Number(minPrice);
      const maxOk = maxPrice === "" || price <= Number(maxPrice);

      return titleMatch && brandMatch && minOk && maxOk;
    });
  }, [listings, search, filterBrand, minPrice, maxPrice]);

  return (
    <div>
      <SellerRaiseDispute
        isOpen={raiseDisputeOpen}
        onClose={() => setRaiseDisputeOpen(false)}
        sellerId={sellerId || ""}
        context={{
          type: "platform",
        }}
      />
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Raise Dispute Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setRaiseDisputeOpen(true)}
            size="lg"
            className="shadow-lg flex items-center gap-2"
          >
            <Flag className="h-4 w-4" />
            Raise Dispute
          </Button>
        </div>

        {/* 🏞 Hero Section */}
        <div className="relative h-[500px] mt-16">
        <img src={heroImage} alt="ProtiMart Hero" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-5xl font-bold text-white mb-4">
              Discover <span className="gradient-text">Quality Products</span>
            </h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Browse top products from trusted sellers and verified brands
            </p>
          </div>
        </div>
      </div>

      {/* 🔍 Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name..."
                className="w-60"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                className="border rounded-md p-2 text-sm"
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                aria-label="Filter by brand"
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b.brand_id} value={b.name || ""}>
                    {b.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2 items-center">
                <Label className="text-sm">Price ₹</Label>
                <Input
                  type="number"
                  placeholder="Min"
                  className="w-20"
                  value={minPrice === "" ? "" : minPrice}
                  onChange={(e) => setMinPrice(e.target.value === "" ? "" : Number(e.target.value))}
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  className="w-20"
                  value={maxPrice === "" ? "" : maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setFilterBrand("");
                  setMinPrice("");
                  setMaxPrice("");
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 🛍 Product Grid */}
        <div className="flex items-center gap-2 mt-4">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold gradient-text">All Products</h2>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse flex-shrink-0 w-80">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </CardContent>
                </Card>
              ))
            ) : filteredListings.length === 0 ? (
              <div className="text-muted-foreground text-center col-span-full py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>No products found</p>
              </div>
            ) : (
              filteredListings.map((listing) => {
              const images = listing.listing_images || [];
              const currentImageIndex = currentImageIndexes[listing.listing_id] || 0;
              const currentImage = images[currentImageIndex] || images[0];
              
              const brandName = listing.global_products?.brands?.name || "Unknown Brand";
              const productName = listing.seller_title || listing.global_products?.product_name || "Untitled";
              const discount = listing.discount_percentage || 0;
              
              // Get selected variant or first available
              const selectedVariantId = selectedVariants[listing.listing_id];
              const selectedVariant = selectedVariantId 
                ? listing.listing_variants?.find(v => v.variant_id === selectedVariantId)
                : listing.listing_variants?.find(v => v.is_available && v.stock_quantity > 0);
              
              // Use variant price if available, otherwise listing price
              const displayPrice = selectedVariant ? selectedVariant.price : (listing.discounted_price || listing.base_price);
              const originalPrice = selectedVariant ? selectedVariant.price : listing.base_price;

              return (
                <Card
                  key={listing.listing_id}
                  className="group hover:shadow-lg transition cursor-pointer flex-shrink-0 w-80"
                  onClick={() => navigate(`/listing/${listing.listing_id}`)}
                >
                  <div className="h-48 bg-muted flex items-center justify-center overflow-hidden rounded-t-lg relative">
                    {currentImage?.image_url ? (
                      <img
                        src={currentImage.image_url}
                        alt={productName}
                        className="object-cover w-full h-full transition-transform group-hover:scale-105 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          openImageViewer(images, currentImageIndex);
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    )}
                    
                    {/* Image Navigation */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            prevImage(listing.listing_id, images.length);
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors opacity-0 group-hover:opacity-100"
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            nextImage(listing.listing_id, images.length);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors opacity-0 group-hover:opacity-100"
                          aria-label="Next image"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        
                        {/* Image Indicators */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {images.slice(0, 5).map((_, index) => (
                            <button
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndexes(prev => ({
                                  ...prev,
                                  [listing.listing_id]: index
                                }));
                              }}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                              }`}
                              aria-label={`Go to image ${index + 1}`}
                            />
                          ))}
                          {images.length > 5 && (
                            <span className="text-white text-xs ml-1">+{images.length - 5}</span>
                          )}
                        </div>
                      </>
                    )}
                    
                    {discount > 0 && (
                      <Badge className="absolute top-2 right-2 bg-red-500">
                        {discount}% OFF
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {brandName}
                    </p>
                    <h3 className="font-semibold text-lg line-clamp-2">{productName}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {listing.seller_description}
                    </p>
                    
                    {/* Variant Selection */}
                    {listing.listing_variants && listing.listing_variants.length > 1 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Variants:</p>
                        <div className="flex flex-wrap gap-1">
                          {listing.listing_variants
                            .filter(v => v.is_available && v.stock_quantity > 0)
                            .slice(0, 4) // Show max 4 variants
                            .map((variant) => (
                            <button
                              key={variant.variant_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVariants(prev => ({
                                  ...prev,
                                  [listing.listing_id]: variant.variant_id
                                }));
                              }}
                              className={`text-xs px-2 py-1 rounded border transition-colors ${
                                selectedVariant?.variant_id === variant.variant_id
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background hover:bg-muted border-border'
                              }`}
                            >
                              {variant.variant_name || `${variant.size || ''} ${variant.flavor || ''}`.trim() || 'Variant'}
                            </button>
                          ))}
                          {listing.listing_variants.filter(v => v.is_available && v.stock_quantity > 0).length > 4 && (
                            <span className="text-xs text-muted-foreground px-2 py-1">
                              +{listing.listing_variants.filter(v => v.is_available && v.stock_quantity > 0).length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-primary">₹{displayPrice}</span>
                        {discount > 0 && originalPrice !== displayPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{originalPrice}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{listing.rating?.toFixed(1) || "4.5"}</span>
                        <span className="text-xs">({listing.review_count})</span>
                      </div>
                    </div>
                    {listing.health_score && listing.health_score > 70 && (
                      <Badge variant="outline" className="text-xs">
                        Health Score: {listing.health_score}/100
                      </Badge>
                    )}
                    {selectedVariant && selectedVariant.stock_quantity < 10 && selectedVariant.stock_quantity > 0 && (
                      <p className="text-xs text-orange-500">
                        Only {selectedVariant.stock_quantity} left in stock!
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
      </div>

      {/* Image Viewer */}
      <ImageViewer
        images={viewerImages}
        initialIndex={viewerInitialIndex}
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
      />
    </div>
  </div>
);
}
