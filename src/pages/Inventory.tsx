// Comprehensive Inventory Management System
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, Trash2, Plus, Filter, Search, Package, X, Images, ChevronLeft, ChevronRight, Flag, AlertTriangle, RefreshCw } from "lucide-react";
import { BundleCreation } from "@/components/BundleCreation";
import { FilterOptions, ListingWithDetails, VariantForm, BundleWithDetails } from "@/types/inventory.types";
import AddProductDialog from "@/components/AddProductDialog";
import { ImageManager } from "@/components/ImageManager";
import { LowStockNotifications } from "@/components/LowStockNotifications";
import { SimpleRestockDialog } from "@/components/SimpleRestockDialog";
import BundleRestockDialog from "@/components/BundleRestockDialog";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { ProductImageGalleryCard } from "@/components/ProductImageGalleryCard";
import { SellerRaiseDispute } from "@/components/SellerRaiseDispute";
import { PricingBreakdown } from "@/components/PricingBreakdown";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";

interface BundleImageItem {
  image_url: string;
  [key: string]: unknown;
}

interface BundleItem {
  seller_product_listings?: {
    listing_images?: BundleImageItem[];
  };
  [key: string]: unknown;
}

interface BundleWithImages extends Partial<BundleWithDetails> {
  bundle_items?: BundleItem[];
  [key: string]: unknown;
}

// Bundle Image Scroller Component
const BundleImageScroller = ({ bundle }: { bundle: BundleWithImages }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Extract all images from bundle items
  const allImages = bundle.bundle_items?.reduce((images: BundleImageItem[], item: BundleItem) => {
    const itemImages = item.seller_product_listings?.listing_images || [];
    return [...images, ...itemImages];
  }, [] as BundleImageItem[]) || [];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  if (allImages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Package className="h-16 w-16 text-primary" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <img
        src={allImages[currentImageIndex]?.image_url}
        alt="Bundle product"
        className="object-cover w-full h-full"
      />
      
      {allImages.length > 1 && (
        <>
          <button
            onClick={prevImage}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextImage}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          
          {/* Image indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {allImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                aria-label={`Go to image ${idx + 1}`}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function Inventory() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [bundles, setBundles] = useState<BundleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<ListingWithDetails | null>(null);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<BundleWithDetails | null>(null);
  const [raiseDisputeOpen, setRaiseDisputeOpen] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "listing" | "variant" | "bundle";
    id: string;
    name: string;
  } | null>(null);

  // Restock dialog
  const [restockTarget, setRestockTarget] = useState<{
    productId: string;
    productName: string;
    currentStock: number;
    isBundle?: boolean;
  } | null>(null);

  // Bundle restock dialog
  const [bundleRestockTarget, setBundleRestockTarget] = useState<{
    bundle_id: string;
    bundle_name: string;
    total_stock_quantity: number;
  } | null>(null);

  // Product/Bundle detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalProductId, setDetailModalProductId] = useState<string | undefined>();
  const [detailModalBundleId, setDetailModalBundleId] = useState<string | undefined>();

  // Filters
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: "",
    searchType: "name",
    priceRange: undefined,
    discountRange: undefined,
    stockRange: undefined,
    status: undefined,
  });

  // Filter sheet state
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [tempPriceMin, setTempPriceMin] = useState(0);
  const [tempPriceMax, setTempPriceMax] = useState(10000);
  const [tempDiscountMin, setTempDiscountMin] = useState(0);
  const [tempDiscountMax, setTempDiscountMax] = useState(100);
  const [tempStockMin, setTempStockMin] = useState(0);
  const [tempStockMax, setTempStockMax] = useState(1000);

  const loadListings = useCallback(async (seller_id: string) => {
    console.log("Loading inventory for seller:", seller_id);
    
    try {
      const { data, error } = await supabase
        .from("seller_product_listings")
        .select(
          `
          *,
          global_products(
            product_name,
            brand_id,
            brands(name, logo_url)
          ),
          listing_variants(
            variant_id,
            listing_id,
            variant_name,
            sku,
            price,
            original_price,
            stock_quantity,
            reserved_quantity,
            size,
            flavor,
            serving_count,
            batch_number,
            manufacture_date,
            expiry_date,
            is_available,
            ingredient_list,
            allergen_info,
            nutrient_breakdown,
            image_url,
            ingredient_image_url,
            nutrient_table_image_url,
            fssai_label_image_url,
            fssai_number,
            fssai_expiry_date,
            accuracy_attested,
            attested_by,
            attested_at,
            is_p0_compliant,
            health_score,
            created_at,
            updated_at,
            ingredient_image_uploaded_at,
            nutrient_table_image_uploaded_at,
            fssai_label_image_uploaded_at
          ),
          listing_images(image_id, image_url, is_primary, variant_id, sort_order)
        `
        )
        .eq("seller_id", seller_id)
        .order("created_at", { ascending: false });

      if (data) {
        console.log("Found", data.length, "products for seller", seller_id);
      }

      if (error) {
        console.error("Error loading products:", error);
        toast({ 
          title: "Error loading inventory", 
          description: "Failed to load products. Please try refreshing the page.",
          variant: "destructive" 
        });
        return;
      }

      setListings((data as ListingWithDetails[]) || []);
    } catch (err) {
      console.error("Unexpected error in loadListings:", err);
      toast({ 
        title: "Error loading inventory", 
        description: "An unexpected error occurred. Please try refreshing the page.",
        variant: "destructive" 
      });
    }
    
    // Load bundles separately to avoid failing the entire load
    try {
      // Load bundles with product images (using left joins to avoid missing bundles)
      const { data: bundlesData, error: bundlesError } = await supabase
        .from("bundles")
        .select(`
          *,
          bundle_items(
            listing_id,
            quantity,
            seller_product_listings(
              seller_title,
              listing_images(
                image_url,
                is_primary
              )
            )
          )
        `)
        .eq("seller_id", seller_id)
        .order("created_at", { ascending: false });

      if (bundlesData) {
        console.log("Found", bundlesData.length, "bundles for seller", seller_id);
        
        // Debug: Log each bundle's structure
        bundlesData.forEach((bundle, idx) => {
          console.log(`Bundle ${idx + 1}:`, {
            id: bundle.bundle_id,
            name: bundle.bundle_name,
            status: bundle.status,
            itemsCount: bundle.bundle_items?.length || 0,
            hasItems: !!bundle.bundle_items && Array.isArray(bundle.bundle_items)
          });
        });
        
        // Filter out bundles with no valid bundle_items to prevent display issues
        const validBundles = bundlesData.filter(bundle => {
          const isValid = bundle.bundle_items && Array.isArray(bundle.bundle_items) && bundle.bundle_items.length > 0;
          if (!isValid) {
            console.warn(`Filtering out bundle ${bundle.bundle_name} (${bundle.bundle_id}) - no valid items`);
          }
          return isValid;
        }).map(bundle => ({ ...bundle, itemType: 'bundle' as const }));
        
        setBundles(validBundles as BundleWithDetails[]);
        console.log("Valid bundles after filtering:", validBundles.length);
      } else {
        console.log("No bundles data returned from query");
        setBundles([]);
      }

      if (bundlesError) {
        console.error("Error loading bundles:", bundlesError);
        // Don't fail the entire load if bundles fail
        console.warn("Continuing without bundles due to error");
        setBundles([]);
      }
    } catch (bundleErr) {
      console.error("Unexpected error loading bundles:", bundleErr);
      // Continue without bundles
      setBundles([]);
    }
  }, [toast]);

  const loadUserAndListings = useCallback(async () => {
    setLoading(true);
    
    try {
      const sellerId = await getAuthenticatedSellerId();
      
      if (!sellerId) {
        toast({ 
          title: "Seller profile not found", 
          description: "Please complete your seller onboarding first.",
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }
      
      setSellerId(sellerId);
      await loadListings(sellerId);
    } catch (error) {
      console.error("Error in loadUserAndListings:", error);
      toast({ 
        title: "Error loading inventory", 
        description: "Failed to load seller information. Please try refreshing the page.",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }, [toast, loadListings]);

  useEffect(() => {
    loadUserAndListings();
  }, [loadUserAndListings]);

  // Handle restock redirect from dashboard
  useEffect(() => {
    const restockProductId = searchParams.get("restockProductId");
    if (restockProductId && listings.length > 0) {
      const product = listings.find((p) => p.listing_id === restockProductId);
      if (product && product.listing_variants && product.listing_variants.length > 0) {
        // Open restock dialog for the first variant
        const firstVariant = product.listing_variants[0];
        setRestockTarget({
          productId: firstVariant.variant_id || "",
          productName: `${product.seller_title || product.global_products?.product_name} - ${firstVariant.variant_name}`,
          currentStock: firstVariant.stock_quantity,
          isBundle: false,
        });
        // Clear the query parameter
        setSearchParams({});
      }
    }
  }, [searchParams, listings, setSearchParams]);

  // Real-time subscription for product updates - Temporarily disabled for debugging
  // useEffect(() => {
  //   if (!sellerId) return;

  //   const channel = supabase
  //     .channel('inventory-changes')
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: '*',
  //         schema: 'public',
  //         table: 'seller_product_listings',
  //         filter: `seller_id=eq.${sellerId}`
  //       },
  //       () => {
  //         // Reload listings when any change occurs
  //         loadListings(sellerId);
  //       }
  //     )
  //     .subscribe();

  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // }, [sellerId, loadListings]);

  async function handleDeleteListing(listingId: string) {
    if (!sellerId) return;

    try {
      setLoading(true);
      console.log("Starting deletion for listing:", listingId);
      
      // Get all variants for this listing first
      const { data: variants, error: variantsQueryError } = await supabase
        .from("listing_variants")
        .select("variant_id")
        .eq("listing_id", listingId);

      if (variantsQueryError) {
        console.error("Error fetching variants:", variantsQueryError);
        throw variantsQueryError;
      }

      const variantIds = variants?.map(v => v.variant_id) || [];
      console.log("Found variants to delete:", variantIds);

      // Delete all related data using IN operator for better efficiency
      if (variantIds.length > 0) {
        console.log("Deleting cart items for variants...");
        const { error: cartError } = await supabase
          .from("cart_items")
          .delete()
          .in("variant_id", variantIds);

        if (cartError) {
          console.warn("Could not delete cart items:", cartError);
        } else {
          console.log("Successfully deleted cart items for variants");
        }

        console.log("Deleting order items for variants...");
        
        // First, get all order_item_ids for these variants to delete related returns
        const { data: orderItemsToDelete } = await supabase
          .from("order_items")
          .select("order_item_id")
          .in("variant_id", variantIds);

        if (orderItemsToDelete && orderItemsToDelete.length > 0) {
          const orderItemIds = orderItemsToDelete.map(item => item.order_item_id);
          
          console.log("Deleting order returns for order items...");
          const { error: returnsError } = await supabase
            .from("order_returns")
            .delete()
            .in("order_item_id", orderItemIds);

          if (returnsError) {
            console.warn("Could not delete order returns:", returnsError);
          } else {
            console.log("Successfully deleted order returns");
          }
        }

        // Now delete the order items
        const { error: orderError } = await supabase
          .from("order_items")
          .delete()
          .in("variant_id", variantIds);

        if (orderError) {
          console.error("Could not delete order items for variants:", orderError);
        } else {
          console.log("Successfully deleted order items for variants");
        }

        console.log("Deleting product transparency data for variants...");
        const { error: transparencyError } = await supabase
          .from("product_transparency")
          .delete()
          .in("variant_id", variantIds);

        if (transparencyError) {
          console.warn("Could not delete transparency data for variants:", transparencyError);
        } else {
          console.log("Successfully deleted transparency data for variants");
        }

        console.log("Deleting inventory records for variants...");
        const { error: inventoryError } = await supabase
          .from("inventory")
          .delete()
          .in("variant_id", variantIds);

        if (inventoryError) {
          console.warn("Could not delete inventory records for variants:", inventoryError);
        } else {
          console.log("Successfully deleted inventory records for variants");
        }

        console.log("Deleting variant attribute values...");
        const { error: variantAttributesError } = await supabase
          .from("variant_attribute_values")
          .delete()
          .in("variant_id", variantIds);

        if (variantAttributesError) {
          console.warn("Could not delete variant attributes for variants:", variantAttributesError);
        } else {
          console.log("Successfully deleted variant attributes for variants");
        }

        console.log("Deleting variant-specific images...");
        const { error: variantImagesError } = await supabase
          .from("listing_images")
          .delete()
          .in("variant_id", variantIds);

        if (variantImagesError) {
          console.warn("Could not delete variant images:", variantImagesError);
        } else {
          console.log("Successfully deleted variant images");
        }
      }

      // Delete all listing-level related data
      console.log("Deleting cart items for listing...");
      const { error: listingCartError } = await supabase
        .from("cart_items")
        .delete()
        .eq("listing_id", listingId);

      if (listingCartError) {
        console.warn("Could not delete listing cart items:", listingCartError);
      }

      console.log("Deleting order items for listing...");
      
      // First, get all order_item_ids for this listing to delete related returns
      const { data: listingOrderItemsToDelete } = await supabase
        .from("order_items")
        .select("order_item_id")
        .eq("listing_id", listingId);

      if (listingOrderItemsToDelete && listingOrderItemsToDelete.length > 0) {
        const orderItemIds = listingOrderItemsToDelete.map(item => item.order_item_id);
        
        console.log("Deleting order returns for listing order items...");
        const { error: listingReturnsError } = await supabase
          .from("order_returns")
          .delete()
          .in("order_item_id", orderItemIds);

        if (listingReturnsError) {
          console.warn("Could not delete listing order returns:", listingReturnsError);
        }
      }

      // Now delete the order items for the listing
      const { error: listingOrderError } = await supabase
        .from("order_items")
        .delete()
        .eq("listing_id", listingId);

      if (listingOrderError) {
        console.warn("Could not delete listing order items:", listingOrderError);
      }

      console.log("Deleting bundle items referencing this listing...");
      const { error: bundleItemsError } = await supabase
        .from("bundle_items")
        .delete()
        .eq("listing_id", listingId);

      if (bundleItemsError) {
        console.warn("Could not delete bundle items:", bundleItemsError);
      }

      console.log("Deleting product allergens...");
      const { error: allergensError } = await supabase
        .from("product_allergens")
        .delete()
        .eq("listing_id", listingId);

      if (allergensError) {
        console.warn("Could not delete product allergens:", allergensError);
      }

      console.log("Deleting product questions...");
      const { error: questionsError } = await supabase
        .from("product_questions")
        .delete()
        .eq("listing_id", listingId);

      if (questionsError) {
        console.warn("Could not delete product questions:", questionsError);
      }

      console.log("Deleting product reviews...");
      const { error: reviewsError } = await supabase
        .from("product_reviews")
        .delete()
        .eq("listing_id", listingId);

      if (reviewsError) {
        console.warn("Could not delete product reviews:", reviewsError);
      }

      console.log("Deleting product transparency data for listing...");
      const { error: listingTransparencyError } = await supabase
        .from("product_transparency")
        .delete()
        .eq("listing_id", listingId);

      if (listingTransparencyError) {
        console.warn("Could not delete listing transparency data:", listingTransparencyError);
      }

      console.log("Deleting product views...");
      const { error: viewsError } = await supabase
        .from("product_views")
        .delete()
        .eq("listing_id", listingId);

      if (viewsError) {
        console.warn("Could not delete product views:", viewsError);
      }

      console.log("Deleting wishlists...");
      const { error: wishlistsError } = await supabase
        .from("wishlists")
        .delete()
        .eq("listing_id", listingId);

      if (wishlistsError) {
        console.warn("Could not delete wishlists:", wishlistsError);
      }

      // Note: listing_allergens table doesn't exist in schema, skipping deletion

      // Delete listing-level images
      console.log("Deleting listing-level images...");
      const { error: listingImagesError } = await supabase
        .from("listing_images")
        .delete()
        .eq("listing_id", listingId);

      if (listingImagesError) {
        console.warn("Could not delete listing images:", listingImagesError);
      } else {
        console.log("Successfully deleted listing-level images");
      }

      // Now delete variants
      console.log("Deleting variants...");
      const { error: variantsError } = await supabase
        .from("listing_variants")
        .delete()
        .eq("listing_id", listingId);

      if (variantsError) {
        console.error("Error deleting variants:", variantsError);
        throw variantsError;
      }
      console.log("Successfully deleted variants");

      // Finally delete the listing
      console.log("Deleting main listing...");
      const { error } = await supabase
        .from("seller_product_listings")
        .delete()
        .eq("listing_id", listingId)
        .eq("seller_id", sellerId);

      if (error) {
        console.error("Error deleting listing:", error);
        throw error;
      }

      console.log("Successfully deleted listing:", listingId);
      toast({ title: "Product deleted successfully" });
      await loadListings(sellerId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Full delete error:", error);
      toast({
        title: "Error deleting product",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  }

  async function handleDeleteVariant(variantId: string) {
    if (!sellerId) return;

    try {
      setLoading(true);
      
      // First verify the variant belongs to a listing owned by this seller
      const { data: variant, error: verifyError } = await supabase
        .from("listing_variants")
        .select(`
          listing_id, 
          seller_product_listings!inner(seller_id)
        `)
        .eq("variant_id", variantId)
        .eq("seller_product_listings.seller_id", sellerId)
        .single();
      
      if (verifyError || !variant) {
        throw new Error("Variant not found or access denied");
      }
      
      // Delete related data first
      console.log("Deleting cart items for variant...");
      const { error: cartError } = await supabase
        .from("cart_items")
        .delete()
        .eq("variant_id", variantId);

      if (cartError) {
        console.warn("Could not delete cart items:", cartError);
      }

      console.log("Deleting order items for variant...");
      
      // First, get all order_item_ids for this variant to delete related returns
      const { data: orderItemsToDelete } = await supabase
        .from("order_items")
        .select("order_item_id")
        .eq("variant_id", variantId);

      if (orderItemsToDelete && orderItemsToDelete.length > 0) {
        const orderItemIds = orderItemsToDelete.map(item => item.order_item_id);
        
        console.log("Deleting order returns for order items...");
        const { error: returnsError } = await supabase
          .from("order_returns")
          .delete()
          .in("order_item_id", orderItemIds);

        if (returnsError) {
          console.warn("Could not delete order returns:", returnsError);
        }
      }

      // Now delete the order items
      const { error: orderError } = await supabase
        .from("order_items")
        .delete()
        .eq("variant_id", variantId);

      if (orderError) {
        console.warn("Could not delete order items:", orderError);
      }

      console.log("Deleting transparency data for variant...");
      const { error: transparencyError } = await supabase
        .from("product_transparency")
        .delete()
        .eq("variant_id", variantId);

      if (transparencyError) {
        console.warn("Could not delete transparency data:", transparencyError);
      }

      console.log("Deleting inventory record for variant...");
      const { error: inventoryError } = await supabase
        .from("inventory")
        .delete()
        .eq("variant_id", variantId);

      if (inventoryError) {
        console.warn("Could not delete inventory record:", inventoryError);
      }

      console.log("Deleting variant attribute values...");
      const { error: variantAttributesError } = await supabase
        .from("variant_attribute_values")
        .delete()
        .eq("variant_id", variantId);

      if (variantAttributesError) {
        console.warn("Could not delete variant attributes:", variantAttributesError);
      }

      // Now delete the variant
      const { error } = await supabase
        .from("listing_variants")
        .delete()
        .eq("variant_id", variantId);

      if (error) throw error;

      toast({ title: "Variant deleted successfully" });
      await loadListings(sellerId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Variant deletion error:", error);
      toast({
        title: "Error deleting variant",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  }

  async function handleDeleteBundle(bundleId: string) {
  //   if (!sellerId) return;

  //   try {
  //     setLoading(true);
      
  //     // First verify the bundle belongs to this seller
  //     const { data: bundleData, error: verifyError } = await supabase
  //       .from("bundles")
  //       .select("bundle_id, seller_id")
  //       .eq("bundle_id", bundleId)
  //       .eq("seller_id", sellerId)
  //       .single();

  //     if (verifyError || !bundleData) {
  //       throw new Error("Bundle not found or access denied");
  //     }

  //     // Delete related data first
  //     console.log("Deleting bundle items...");
  //     const { error: itemsError } = await supabase
  //       .from("bundle_items")
  //       .delete()
  //       .eq("bundle_id", bundleId);

  //     if (itemsError) {
  //       console.warn("Could not delete bundle items:", itemsError);
  //     }

  //     // Delete the bundle
  //     const { error } = await supabase
  //       .from("bundles")
  //       .delete()
  //       .eq("bundle_id", bundleId)
  //       .eq("seller_id", sellerId);

  //     if (error) throw error;

  //     toast({ title: "Bundle deleted successfully" });
  //     await loadListings(sellerId);
  //   } catch (error) {
  //     const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
  //     console.error("Bundle deletion error:", error);
  //     toast({
  //       title: "Error deleting bundle",
  //       description: errorMessage,
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setLoading(false);
  //     setDeleteTarget(null);
  //   }
  // }
}

  function applyFilters() {
    if (tempPriceMin > 0 || tempPriceMax < 10000) {
      setFilters({
        ...filters,
        priceRange: { min: tempPriceMin, max: tempPriceMax },
      });
    } else {
      setFilters({ ...filters, priceRange: undefined });
    }

    if (tempDiscountMin > 0 || tempDiscountMax < 100) {
      setFilters({
        ...filters,
        discountRange: { min: tempDiscountMin, max: tempDiscountMax },
      });
    } else {
      setFilters({ ...filters, discountRange: undefined });
    }

    if (tempStockMin > 0 || tempStockMax < 1000) {
      setFilters({
        ...filters,
        stockRange: { min: tempStockMin, max: tempStockMax },
      });
    } else {
      setFilters({ ...filters, stockRange: undefined });
    }

    setFilterSheetOpen(false);
  }

  function clearFilters() {
    setFilters({
      searchTerm: "",
      searchType: "name",
      priceRange: undefined,
      discountRange: undefined,
      stockRange: undefined,
      status: undefined,
    });
    setTempPriceMin(0);
    setTempPriceMax(10000);
    setTempDiscountMin(0);
    setTempDiscountMax(100);
    setTempStockMin(0);
    setTempStockMax(1000);
  }

  const filteredListings = useMemo(() => {
    console.log("Filtering listings - Products:", listings.length, "Bundles:", bundles.length);
    
    // Combine products and bundles
    const combinedItems = [
      ...listings.map(l => ({ ...l, itemType: 'product' })),
      ...bundles.map(b => ({ ...b, itemType: 'bundle' }))
    ];

    console.log("Combined items total:", combinedItems.length, 
      "Products:", combinedItems.filter(i => i.itemType === 'product').length,
      "Bundles:", combinedItems.filter(i => i.itemType === 'bundle').length);

    let result = [...combinedItems];

    // Search filter
    if (filters.searchTerm.trim()) {
      const search = filters.searchTerm.toLowerCase();
      result = result.filter((item: Record<string, unknown>) => {
        if (item.itemType === 'product') {
          if (filters.searchType === "name") {
            return (
              (item.seller_title as string)?.toLowerCase().includes(search) ||
              ((item.global_products as Record<string, unknown>)?.product_name as string)?.toLowerCase().includes(search)
            );
          } else if (filters.searchType === "brand") {
            return ((item.global_products as Record<string, unknown>)?.brands as Record<string, unknown>)?.name
              ?.toString()
              .toLowerCase()
              .includes(search);
          } else if (filters.searchType === "variant") {
            return (item.listing_variants as VariantForm[])?.some((v: VariantForm) =>
              v.variant_name?.toLowerCase().includes(search)
            );
          }
        }
        return true;
      });
    }

    // Price filter
    if (filters.priceRange) {
      result = result.filter((item: Record<string, unknown>) => {
        const price = item.itemType === 'product' ? (item.base_price as number) : (item.base_price as number);
        return (
          price >= filters.priceRange!.min &&
          price <= filters.priceRange!.max
        );
      });
    }

    // Discount filter
    if (filters.discountRange) {
      result = result.filter((item: Record<string, unknown>) => {
        const discount = (item.discount_percentage as number) || 0;
        return (
          discount >= filters.discountRange!.min &&
          discount <= filters.discountRange!.max
        );
      });
    }

    // Stock filter - only for products
    if (filters.stockRange) {
      result = result.filter((item: Record<string, unknown>) => {
        if (item.itemType === 'product') {
          return (
            (item.total_stock_quantity as number) >= filters.stockRange!.min &&
            (item.total_stock_quantity as number) <= filters.stockRange!.max
          );
        }
        return true; // Bundles don't have stock
      });
    }

    // Status filter
    if (filters.status) {
      result = result.filter((item: Record<string, unknown>) => item.status === filters.status);
    }

    return result;
  }, [listings, bundles, filters]);

  const activeFilterCount = [
    filters.searchTerm,
    filters.priceRange,
    filters.discountRange,
    filters.stockRange,
    filters.status,
  ].filter(Boolean).length;

  // Compute status counts for summary
  const statusCounts = useMemo(() => {
    const counts = {
      active: 0,
      pending: 0,
      failed: 0,
      expired: 0,
      draft: 0,
      inactive: 0,
    };
    listings.forEach((listing) => {
      if (listing.status === "active") counts.active++;
      else if (listing.status === "pending_approval") counts.pending++;
      else if (listing.status === "failed_approval") counts.failed++;
      else if (listing.status === "expired") counts.expired++;
      else if (listing.status === "draft") counts.draft++;
      else if (listing.status === "inactive") counts.inactive++;
    });
    return counts;
  }, [listings]);

  return (
    <>
      <SellerRaiseDispute
        isOpen={raiseDisputeOpen}
        onClose={() => setRaiseDisputeOpen(false)}
        sellerId={sellerId || ""}
        context={{
          type: "product",
        }}
      />
      <div className="p-6 space-y-6">
      {/* Low Stock Notifications at Top - Temporarily disabled for debugging */}
      {/* <LowStockNotifications
        onProductClick={(productId) => {
          setDetailModalProductId(productId);
          setDetailModalBundleId(undefined);
          setDetailModalOpen(true);
        }}
        onBundleClick={(bundleId) => {
          setDetailModalBundleId(bundleId);
          setDetailModalProductId(undefined);
          setDetailModalOpen(true);
        }}
      /> */}

      {/* Commission & GST Information Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <AlertTriangle className="h-5 w-5" />
            Important: Transaction Charges Apply
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-blue-800">
            When you receive orders, payments, refunds, or cancellations, Razorpay automatically deducts:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded border border-blue-100">
              <p className="text-sm font-semibold text-blue-900">Platform Commission</p>
              <p className="text-2xl font-bold text-red-600">2%</p>
              <p className="text-xs text-gray-600">On every transaction</p>
            </div>
            <div className="bg-white p-3 rounded border border-blue-100">
              <p className="text-sm font-semibold text-blue-900">GST on Commission</p>
              <p className="text-2xl font-bold text-orange-600">18%</p>
              <p className="text-xs text-gray-600">On the 2% commission</p>
            </div>
          </div>
          <p className="text-xs text-blue-700 font-medium">
            Example: ₹100 sale = ₹100 - ₹2 (commission) - ₹0.36 (18% GST) = ₹97.64 you receive
          </p>
          <p className="text-xs text-blue-700">
            Please adjust your product MRP accordingly to ensure your desired profit margin.
          </p>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Inventory</h1>
          <p className="text-muted-foreground">
            Manage your product listings and variants
          </p>
          {/* Debug Info */}
          <div className="text-xs text-gray-500 mt-1">
            Products: {listings.length} | Bundles: {bundles.length} | Total Items: {filteredListings.length}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (sellerId) {
                console.log("🔄 Force refreshing inventory...");
                loadListings(sellerId);
              }
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setRaiseDisputeOpen(true)}
            className="flex items-center gap-2"
          >
            <Flag className="h-4 w-4" />
            Raise Dispute
          </Button>
          <Button variant="outline" onClick={() => setImageManagerOpen(true)}>
            <Images className="h-4 w-4 mr-2" />
            Manage Images
          </Button>
          <Button variant="outline" onClick={() => setBundleDialogOpen(true)}>
            <Package className="h-4 w-4 mr-2" />
            Create Bundle
          </Button>
          <Button onClick={() => {
            setEditingListing(null); // Clear any editing state for new product
            setAddDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Product Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{statusCounts.active}</p>
            <p className="text-xs text-green-600">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">{statusCounts.pending}</p>
            <p className="text-xs text-yellow-600">Pending Approval</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{statusCounts.failed}</p>
            <p className="text-xs text-red-600">Failed Approval</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-3 text-center cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => setFilters({ ...filters, status: "expired" })}>
            <p className="text-2xl font-bold text-orange-700">{statusCounts.expired}</p>
            <p className="text-xs text-orange-600">⚠️ FSSAI Expired</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-gray-700">{statusCounts.draft}</p>
            <p className="text-xs text-gray-600">Draft</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-slate-700">{statusCounts.inactive}</p>
            <p className="text-xs text-slate-600">Inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] flex gap-2">
              <Select
                value={filters.searchType}
                onValueChange={(value: "name" | "brand" | "variant") =>
                  setFilters({ ...filters, searchType: value })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Product/Bundle Name</SelectItem>
                  <SelectItem value="brand">Brand Name</SelectItem>
                  <SelectItem value="variant">Variant</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder={`Search by ${filters.searchType}...`}
                  value={filters.searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({ ...filters, searchTerm: e.target.value })
                  }
                />
              </div>
            </div>

            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Products</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value: string) =>
                        setFilters({
                          ...filters,
                          status: value === "all" ? undefined : (value as "draft" | "active" | "inactive" | "pending_approval" | "failed_approval" | "expired"),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending_approval">Pending Approval</SelectItem>
                        <SelectItem value="failed_approval">Failed Approval</SelectItem>
                        <SelectItem value="expired">Expired FSSAI</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-2">
                    <Label>Price Range (₹)</Label>
                    <div className="pt-4">
                      <Slider
                        min={0}
                        max={10000}
                        step={100}
                        value={[tempPriceMin, tempPriceMax]}
                        onValueChange={([min, max]: [number, number]) => {
                          setTempPriceMin(min);
                          setTempPriceMax(max);
                        }}
                      />
                      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                        <span>₹{tempPriceMin}</span>
                        <span>₹{tempPriceMax}</span>
                      </div>
                    </div>
                  </div>

                  {/* Discount Range */}
                  <div className="space-y-2">
                    <Label>Discount Range (%)</Label>
                    <div className="pt-4">
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[tempDiscountMin, tempDiscountMax]}
                        onValueChange={([min, max]: [number, number]) => {
                          setTempDiscountMin(min);
                          setTempDiscountMax(max);
                        }}
                      />
                      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                        <span>{tempDiscountMin}%</span>
                        <span>{tempDiscountMax}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Range */}
                  <div className="space-y-2">
                    <Label>Stock Range</Label>
                    <div className="pt-4">
                      <Slider
                        min={0}
                        max={1000}
                        step={10}
                        value={[tempStockMin, tempStockMax]}
                        onValueChange={([min, max]: [number, number]) => {
                          setTempStockMin(min);
                          setTempStockMax(max);
                        }}
                      />
                      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                        <span>{tempStockMin}</span>
                        <span>{tempStockMax}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={clearFilters} variant="outline" className="flex-1">
                      Clear All
                    </Button>
                    <Button onClick={applyFilters} className="flex-1">
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading inventory...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No products found</p>
            <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Product
            </Button>
          </div>
        ) : (
          filteredListings.map((item) => {
            // Handle both products and bundles
            if ('itemType' in item && item.itemType === 'bundle') {
              const bundle = item as BundleWithDetails;
              console.log("Rendering bundle:", bundle.bundle_id, bundle.bundle_name);
              const bundleName = bundle.bundle_name;
              const discount = bundle.discount_percentage || 0;

              return (
                <Card key={bundle.bundle_id} className="overflow-hidden border-primary/20">
                  <div className="relative">
                    <div className="aspect-square bg-muted relative">
                      {/* Bundle Product Images Scroller */}
                      <BundleImageScroller bundle={bundle as unknown as BundleWithImages} />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Badge
                        variant={
                          bundle.status === "active"
                            ? "default"
                            : bundle.status === "draft"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {bundle.status}
                      </Badge>
                      {discount > 0 && (
                        <Badge variant="destructive">{discount}% OFF</Badge>
                      )}
                      <Badge className="bg-primary/80">Bundle</Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg line-clamp-2">
                        {bundleName}
                      </h3>

                      {bundle.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {bundle.description}
                        </p>
                      )}

                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          ₹{bundle.discounted_price?.toFixed(2) || bundle.base_price?.toFixed(2)}
                        </span>
                        {bundle.base_price && bundle.discounted_price && bundle.base_price !== bundle.discounted_price && (
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{bundle.base_price.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div>Items: {bundle.total_items}</div>
                        <div>•</div>
                        <div>Stock: {bundle.total_stock_quantity || 0}</div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setEditingBundle(bundle);
                            setBundleDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            console.log("Restock clicked for bundle:", bundle.bundle_id);
                            setBundleRestockTarget({
                              bundle_id: bundle.bundle_id,
                              bundle_name: bundle.bundle_name,
                              total_stock_quantity: bundle.total_stock_quantity,
                            });
                          }}
                          title="Restock Bundle"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Restock
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setDeleteTarget({
                              type: "bundle",
                              id: bundle.bundle_id,
                              name: bundleName,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            // Original product rendering
            const listing = item as ListingWithDetails;
            const brandName = listing.global_products?.brands?.name || "Unknown Brand";
            const productName =
              listing.seller_title || listing.global_products?.product_name || "Untitled";
            const variantCount = listing.listing_variants?.length || 0;
            const discount = listing.discount_percentage || 0;

            // Combine product display images with P0 compliance images
            const productImages = listing.listing_images || [];
            const p0Images: Array<{image_id: string; image_url: string; is_primary: boolean}> = [];
            
            // Add P0 images from all variants
            listing.listing_variants?.forEach((variant: any) => {
              // Add product photo (image_url)
              if (variant.image_url) {
                p0Images.push({
                  image_id: `product_${variant.variant_id}`,
                  image_url: variant.image_url,
                  is_primary: false
                });
              }
              if (variant.ingredient_image_url) {
                p0Images.push({
                  image_id: `ingredient_${variant.variant_id}`,
                  image_url: variant.ingredient_image_url,
                  is_primary: false
                });
              }
              if (variant.nutrient_table_image_url) {
                p0Images.push({
                  image_id: `nutrient_${variant.variant_id}`,
                  image_url: variant.nutrient_table_image_url,
                  is_primary: false
                });
              }
              if (variant.fssai_label_image_url) {
                p0Images.push({
                  image_id: `fssai_${variant.variant_id}`,
                  image_url: variant.fssai_label_image_url,
                  is_primary: false
                });
              }
            });
            
            // Combine: primary image first, then other product images, then P0 images
            const primaryImage = productImages.find(img => img.is_primary);
            const otherImages = productImages.filter(img => !img.is_primary);
            const allImages = primaryImage 
              ? [primaryImage, ...otherImages, ...p0Images]
              : [...productImages, ...p0Images];

            return (
              <Card key={listing.listing_id} className="overflow-hidden">
                <div className="relative">
                  <ProductImageGalleryCard
                    images={allImages}
                    productName={productName}
                    className="aspect-square"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge
                      variant={
                        listing.status === "active"
                          ? "default"
                          : listing.status === "draft"
                          ? "secondary"
                          : listing.status === "pending_approval"
                          ? "outline"
                          : listing.status === "failed_approval"
                          ? "destructive"
                          : listing.status === "expired"
                          ? "destructive"
                          : "outline"
                      }
                      className={
                        listing.status === "pending_approval" 
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300" 
                          : listing.status === "expired"
                          ? "bg-red-100 text-red-800 border-red-300"
                          : ""
                      }
                    >
                      {listing.status === "pending_approval" ? "⏳ Pending" : 
                       listing.status === "failed_approval" ? "❌ Failed" :
                       listing.status === "expired" ? "⚠️ Expired" :
                       listing.status}
                    </Badge>
                    {discount > 0 && (
                      <Badge variant="destructive">{discount}% OFF</Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{brandName}</p>
                    <h3 className="font-semibold text-lg line-clamp-2">
                      {productName}
                    </h3>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        ₹{(listing.base_price as number).toFixed(2)}
                      </span>
                      {listing.discounted_price && (
                        <span className="text-sm text-muted-foreground line-through">
                          ₹{(listing.discounted_price as number).toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div>Stock: {listing.total_stock_quantity}</div>
                      <div>•</div>
                      <div>{variantCount} variant(s)</div>
                    </div>

                    {listing.health_score && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Health Score:</span>
                        <Badge variant="outline">{listing.health_score}/100</Badge>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          console.log("View Details clicked for product:", listing.listing_id);
                          setDetailModalProductId(listing.listing_id);
                          setDetailModalBundleId(undefined);
                          setDetailModalOpen(true);
                        }}
                        title="View product details, description, and allergens"
                      >
                        ℹ Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingListing(listing);
                          setAddDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setDeleteTarget({
                            type: "listing",
                            id: listing.listing_id,
                            name: productName,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Variants List */}
                    {variantCount > 0 && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <p className="text-sm font-medium">Variants:</p>
                        {listing.listing_variants?.map((variant: VariantForm) => (
                          <div
                            key={variant.variant_id}
                            className="flex justify-between items-center text-sm p-2 bg-muted rounded"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{variant.variant_name}</p>
                              <p className="text-muted-foreground">
                                ₹{(variant.price as number).toFixed(2)} • Stock: {variant.stock_quantity}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setRestockTarget({
                                    productId: variant.variant_id || "",
                                    productName: `${listing.seller_title || listing.global_products?.product_name} - ${variant.variant_name}`,
                                    currentStock: variant.stock_quantity,
                                    isBundle: false,
                                  })
                                }
                              >
                                Restock
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "variant",
                                    id: variant.variant_id || "",
                                    name: variant.variant_name,
                                  })
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setEditingListing(null); // Clear editing state when dialog closes
          }
        }}
        onSuccess={() => {
          if (sellerId) loadListings(sellerId);
          setEditingListing(null); // Clear editing state on success
        }}
        editingProduct={editingListing}
      />

      {/* Restock Dialog */}
      {restockTarget && (
        <SimpleRestockDialog
          open={!!restockTarget}
          onOpenChange={(open) => !open && setRestockTarget(null)}
          productId={restockTarget.productId}
          productName={restockTarget.productName}
          currentStock={restockTarget.currentStock}
          isBundle={restockTarget.isBundle || false}
          isVariant={true}  // We're always restocking individual variants in inventory
          sellerId={sellerId}
          onSuccess={() => {
            if (sellerId) loadListings(sellerId);
            setRestockTarget(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "listing" ? (
                <>
                  This will permanently delete the product "{deleteTarget.name}" and
                  all its variants, images, and related data. This action cannot be
                  undone.
                </>
              ) : deleteTarget?.type === "bundle" ? (
                <>
                  This will permanently delete the bundle "{deleteTarget.name}" and
                  all its related data. This action cannot be undone.
                </>
              ) : (
                <>
                  This will permanently delete the variant "{deleteTarget?.name}".
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget?.type === "listing") {
                  handleDeleteListing(deleteTarget.id);
                } else if (deleteTarget?.type === "bundle") {
                  handleDeleteBundle(deleteTarget.id);
                } else if (deleteTarget?.type === "variant") {
                  handleDeleteVariant(deleteTarget.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Low Stock Notifications - Moved to top */}

      {/* Image Manager Dialog */}
      <ImageManager 
        open={imageManagerOpen} 
        onOpenChange={setImageManagerOpen} 
      />
      {/* Bundle Creation Dialog */}
      <BundleCreation
        open={bundleDialogOpen}
        onClose={() => {
          setBundleDialogOpen(false);
          setEditingBundle(null);
          if (sellerId) loadListings(sellerId);
        }}
        editingBundle={editingBundle ? {
          bundle_id: editingBundle.bundle_id,
          bundle_name: editingBundle.bundle_name,
          description: editingBundle.description,
          discount_percentage: editingBundle.discount_percentage,
          status: editingBundle.status,
          total_stock_quantity: editingBundle.total_stock_quantity,
        } : undefined}
      />

      {/* Restock Dialog for Bundles */}
      {bundleRestockTarget && (
        <BundleRestockDialog
          open={!!bundleRestockTarget}
          onOpenChange={(open) => {
            if (!open) setBundleRestockTarget(null);
          }}
          bundle={bundleRestockTarget}
          onSuccess={() => {
            if (sellerId) loadListings(sellerId);
            setBundleRestockTarget(null);
          }}
        />
      )}

      {/* Product/Bundle Detail Modal */}
      <ProductDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        productId={detailModalProductId}
        bundleId={detailModalBundleId}
      />
      </div>
    </>
  );
}
