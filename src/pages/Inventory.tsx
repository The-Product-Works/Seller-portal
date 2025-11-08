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
import { Edit, Trash2, Plus, Filter, Search, Package, X, Images } from "lucide-react";
import { BundleCreation } from "@/components/BundleCreation";
import { FilterOptions, ListingWithDetails, VariantForm, BundleWithDetails } from "@/types/inventory.types";
import AddProductDialog from "@/components/AddProductDialog";
import { ImageManager } from "@/components/ImageManager";
import { LowStockNotifications } from "@/components/LowStockNotifications";
import RestockDialog from "@/components/RestockDialog";
import BundleRestockDialog from "@/components/BundleRestockDialog";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";

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
  const [editingBundle, setEditingBundle] = useState<Record<string, unknown> | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "listing" | "variant" | "bundle";
    id: string;
    name: string;
  } | null>(null);

  // Restock dialog
  const [restockTarget, setRestockTarget] = useState<{
    variant: VariantForm;
    listingId: string;
  } | null>(null);

  // Bundle restock dialog
  const [bundleRestockTarget, setBundleRestockTarget] = useState<Omit<BundleWithDetails, 'itemType'> | null>(null);

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
        listing_variants(*),
        listing_images(image_id, image_url, is_primary)
      `
      )
      .eq("seller_id", seller_id)
      .order("created_at", { ascending: false });

    if (data) {
      console.log("Found", data.length, "products for seller", seller_id);
    }

    if (error) {
      console.error(error);
      toast({ title: "Error loading inventory", variant: "destructive" });
      return;
    }

    setListings((data as ListingWithDetails[]) || []);
    
    // Load bundles
    const { data: bundlesData, error: bundlesError } = await supabase
      .from("bundles")
      .select("*")
      .eq("seller_id", seller_id)
      .order("created_at", { ascending: false });

    if (bundlesData) {
      console.log("Found", bundlesData.length, "bundles for seller", seller_id);
    }

    if (bundlesError) {
      console.error("Error loading bundles:", bundlesError);
    }

    setBundles((bundlesData as Array<Record<string, unknown>>) || []);
  }, [toast]);

  const loadUserAndListings = useCallback(async () => {
    setLoading(true);
    
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
    setLoading(false);
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
        setRestockTarget({
          variant: product.listing_variants[0],
          listingId: product.listing_id,
        });
        // Clear the query parameter
        setSearchParams({});
      }
    }
  }, [searchParams, listings, setSearchParams]);

  // Real-time subscription for product updates
  useEffect(() => {
    if (!sellerId) return;

    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seller_product_listings',
          filter: `seller_id=eq.${sellerId}`
        },
        () => {
          // Reload listings when any change occurs
          loadListings(sellerId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerId, loadListings]);

  async function handleDeleteListing(listingId: string) {
    if (!sellerId) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("seller_product_listings")
        .delete()
        .eq("listing_id", listingId)
        .eq("seller_id", sellerId); // Ensure seller can only delete their own listings

      if (error) throw error;

      toast({ title: "Product deleted successfully" });
      await loadListings(sellerId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
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
      const { data: variant } = await supabase
        .from("listing_variants")
        .select("listing_id, seller_product_listings!inner(seller_id)")
        .eq("variant_id", variantId)
        .eq("seller_product_listings.seller_id", sellerId)
        .single();
      
      if (!variant) {
        throw new Error("Variant not found or access denied");
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
    if (!sellerId) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("bundles")
        .delete()
        .eq("bundle_id", bundleId)
        .eq("seller_id", sellerId);

      if (error) throw error;

      toast({ title: "Bundle deleted successfully" });
      await loadListings(sellerId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error deleting bundle",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
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
    // Combine products and bundles
    const combinedItems = [
      ...listings.map(l => ({ ...l, itemType: 'product' })),
      ...bundles.map(b => ({ ...b, itemType: 'bundle' }))
    ];

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
        } else if (item.itemType === 'bundle') {
          // Bundle search by name
          return (item.bundle_name as string)?.toLowerCase().includes(search);
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

  return (
    <div className="p-6 space-y-6">
      {/* Low Stock Notifications at Top */}
      <LowStockNotifications
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
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Inventory</h1>
          <p className="text-muted-foreground">
            Manage your product listings and variants
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImageManagerOpen(true)}>
            <Images className="h-4 w-4 mr-2" />
            Manage Images
          </Button>
          <Button variant="outline" onClick={() => setBundleDialogOpen(true)}>
            <Package className="h-4 w-4 mr-2" />
            Create Bundle
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
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
                          status: value === "all" ? undefined : (value as "draft" | "active" | "inactive"),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
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
          filteredListings.map((item: ListingWithDetails | BundleWithDetails) => {
            // Handle both products and bundles
            if (item.itemType === 'bundle') {
              const bundle = item as BundleWithDetails;
              console.log("Rendering bundle:", bundle.bundle_id, bundle.bundle_name);
              const bundleName = bundle.bundle_name;
              const discount = bundle.discount_percentage || 0;

              return (
                <Card key={bundle.bundle_id} className="overflow-hidden border-primary/20">
                  <div className="aspect-square bg-muted relative">
                    {bundle.thumbnail_url ? (
                      <img
                        src={bundle.thumbnail_url}
                        alt={bundleName}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-16 w-16 text-primary" />
                      </div>
                    )}
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
                            const { itemType, ...bundleData } = bundle;
                            setBundleRestockTarget(bundleData);
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
                              id: item.bundle_id,
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
            const primaryImage = listing.listing_images?.find((img) => img.is_primary);
            const brandName = listing.global_products?.brands?.name || "Unknown Brand";
            const productName =
              listing.seller_title || listing.global_products?.product_name || "Untitled";
            const variantCount = listing.listing_variants?.length || 0;
            const discount = listing.discount_percentage || 0;

            return (
              <Card key={listing.listing_id} className="overflow-hidden">
                <div className="aspect-square bg-muted relative">
                  {primaryImage?.image_url ? (
                    <img
                      src={primaryImage.image_url}
                      alt={productName}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge
                      variant={
                        listing.status === "active"
                          ? "default"
                          : listing.status === "draft"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {listing.status}
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
                                    variant: variant,
                                    listingId: listing.listing_id,
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
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          if (sellerId) loadListings(sellerId);
        }}
        editingProduct={editingListing}
      />

      {/* Restock Dialog */}
      {restockTarget && restockTarget.variant.variant_id && (
        <RestockDialog
          open={!!restockTarget}
          onOpenChange={(open) => !open && setRestockTarget(null)}
          onSuccess={() => {
            if (sellerId) loadListings(sellerId);
          }}
          variant={{
            variant_id: restockTarget.variant.variant_id,
            variant_name: restockTarget.variant.variant_name,
            sku: restockTarget.variant.sku,
            stock_quantity: restockTarget.variant.stock_quantity,
          }}
          listingId={restockTarget.listingId}
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
        editingBundle={editingBundle}
      />

      {/* Restock Dialog for Products */}
      {restockTarget && (
        <RestockDialog
          open={!!restockTarget}
          onOpenChange={(open) => {
            if (!open) setRestockTarget(null);
          }}
          variant={{
            variant_id: restockTarget.variant.variant_id || "",
            variant_name: restockTarget.variant.variant_name,
            sku: restockTarget.variant.sku,
            stock_quantity: restockTarget.variant.stock_quantity,
          }}
          listingId={restockTarget.listingId}
          onSuccess={() => {
            if (sellerId) loadListings(sellerId);
            setRestockTarget(null);
          }}
        />
      )}

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
  );
}
