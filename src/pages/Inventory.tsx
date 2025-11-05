// Comprehensive Inventory Management System
import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Edit, Trash2, Plus, Filter, Search, Package, X } from "lucide-react";
import { FilterOptions, ListingWithDetails } from "@/types/inventory.types";
import AddProductDialog from "@/components/AddProductDialog";
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
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "listing" | "variant";
    id: string;
    name: string;
  } | null>(null);

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

  useEffect(() => {
    loadUserAndListings();
  }, []);

  async function loadUserAndListings() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      toast({ title: "Not signed in", variant: "destructive" });
      setLoading(false);
      return;
    }
    setSellerId(user.id);
    await loadListings(user.id);
    setLoading(false);
  }

  async function loadListings(seller_id: string) {
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

    if (error) {
      console.error(error);
      toast({ title: "Error loading inventory", variant: "destructive" });
      return;
    }

    setListings((data as any) || []);
  }

  async function handleDeleteListing(listingId: string) {
    if (!sellerId) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("seller_product_listings")
        .delete()
        .eq("listing_id", listingId);

      if (error) throw error;

      toast({ title: "Product deleted successfully" });
      await loadListings(sellerId);
    } catch (error: any) {
      toast({
        title: "Error deleting product",
        description: error.message,
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
      const { error } = await supabase
        .from("listing_variants")
        .delete()
        .eq("variant_id", variantId);

      if (error) throw error;

      toast({ title: "Variant deleted successfully" });
      await loadListings(sellerId);
    } catch (error: any) {
      toast({
        title: "Error deleting variant",
        description: error.message,
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
    let result = [...listings];

    // Search filter
    if (filters.searchTerm.trim()) {
      const search = filters.searchTerm.toLowerCase();
      result = result.filter((listing) => {
        if (filters.searchType === "name") {
          return (
            listing.seller_title?.toLowerCase().includes(search) ||
            listing.global_products?.product_name?.toLowerCase().includes(search)
          );
        } else if (filters.searchType === "brand") {
          return listing.global_products?.brands?.name
            ?.toLowerCase()
            .includes(search);
        } else if (filters.searchType === "variant") {
          return listing.listing_variants?.some((v: any) =>
            v.variant_name?.toLowerCase().includes(search)
          );
        }
        return true;
      });
    }

    // Price filter
    if (filters.priceRange) {
      result = result.filter(
        (listing) =>
          listing.base_price >= filters.priceRange!.min &&
          listing.base_price <= filters.priceRange!.max
      );
    }

    // Discount filter
    if (filters.discountRange) {
      result = result.filter((listing) => {
        const discount = listing.discount_percentage || 0;
        return (
          discount >= filters.discountRange!.min &&
          discount <= filters.discountRange!.max
        );
      });
    }

    // Stock filter
    if (filters.stockRange) {
      result = result.filter(
        (listing) =>
          listing.total_stock_quantity >= filters.stockRange!.min &&
          listing.total_stock_quantity <= filters.stockRange!.max
      );
    }

    // Status filter
    if (filters.status) {
      result = result.filter((listing) => listing.status === filters.status);
    }

    return result;
  }, [listings, filters]);

  const activeFilterCount = [
    filters.searchTerm,
    filters.priceRange,
    filters.discountRange,
    filters.stockRange,
    filters.status,
  ].filter(Boolean).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Inventory</h1>
          <p className="text-muted-foreground">
            Manage your product listings and variants
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] flex gap-2">
              <Select
                value={filters.searchType}
                onValueChange={(value: any) =>
                  setFilters({ ...filters, searchType: value })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Product Name</SelectItem>
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
                  onChange={(e) =>
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
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          status: value === "all" ? undefined : (value as any),
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
                        onValueChange={([min, max]) => {
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
                        onValueChange={([min, max]) => {
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
                        onValueChange={([min, max]) => {
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
          filteredListings.map((listing) => {
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
                        ₹{listing.base_price}
                      </span>
                      {listing.discounted_price && (
                        <span className="text-sm text-muted-foreground line-through">
                          ₹{listing.discounted_price}
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
                        {listing.listing_variants?.map((variant: any) => (
                          <div
                            key={variant.variant_id}
                            className="flex justify-between items-center text-sm p-2 bg-muted rounded"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{variant.variant_name}</p>
                              <p className="text-muted-foreground">
                                ₹{variant.price} • Stock: {variant.stock_quantity}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "variant",
                                  id: variant.variant_id,
                                  name: variant.variant_name,
                                })
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
    </div>
  );
}
