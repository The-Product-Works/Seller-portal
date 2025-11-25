import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { X, Package } from "lucide-react";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";
import { BundlePreviewModal } from "@/components/BundlePreviewModal";

interface Listing {
  listing_id: string;
  seller_title: string;
  base_price: number;
  listing_images?: Array<{ image_url: string; is_primary: boolean }>;
  total_stock_quantity: number;
}

interface Variant {
  variant_id: string;
  variant_name: string;
  price: number;
  sku?: string;
  stock_quantity: number;
}

interface SelectedListingItem {
  listing: Listing;
  quantity: number;
  variant?: Variant;
}

interface BundleData {
  bundle_id: string;
  bundle_name: string;
  description?: string;
  discount_percentage?: number;
  status?: 'draft' | 'active';
  total_stock_quantity?: number;
}

interface BundleCreationProps {
  open: boolean;
  onClose: () => void;
  editingBundle?: BundleData;
}

export function BundleCreation({ open, onClose, editingBundle }: BundleCreationProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedListingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [bundleName, setBundleName] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [bundleStock, setBundleStock] = useState<number>(0);
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  // Load editing bundle data
  useEffect(() => {
    const handleLoadBundle = async () => {
      if (editingBundle && open) {
        setBundleName(editingBundle.bundle_name as string);
        setDescription((editingBundle.description as string) || "");
        setDiscountPercentage((editingBundle.discount_percentage as number) || 0);
        setBundleStock((editingBundle.total_stock_quantity as number) || 0);
        setStatus((editingBundle.status as "draft" | "active") || "draft");
        // Load bundle items
        await loadBundleItems();
      } else if (open && !editingBundle) {
        // Reset for new bundle
        setBundleName("");
        setDescription("");
        setDiscountPercentage(0);
        setBundleStock(0);
        setSelectedItems([]);
        setStatus("draft");
      }
    };
    handleLoadBundle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingBundle]);

  const loadBundleItems = async () => {
    try {
      const { data, error } = await supabase
        .from("bundle_items")
        .select("listing_id, quantity, variant_id, allocation_percentage")
        .eq("bundle_id", editingBundle.bundle_id);

      if (error) throw error;

      if (data) {
        // Fetch listing details for each item
        const itemsWithDetails = await Promise.all(
          data.map(async (item) => {
            const { data: listing } = await supabase
              .from("seller_product_listings")
              .select("listing_id, seller_title, base_price, total_stock_quantity, listing_images(image_url, is_primary)")
              .eq("listing_id", item.listing_id)
              .single();

            let variant: Variant | undefined;
            if (item.variant_id) {
              const { data: variantData } = await supabase
                .from("listing_variants")
                .select("variant_id, variant_name, price, sku, stock_quantity")
                .eq("variant_id", item.variant_id)
                .single();

              if (variantData) {
                variant = variantData;
              }
            }

            return {
              listing: listing || { listing_id: item.listing_id, seller_title: "Unknown", base_price: 0, total_stock_quantity: 0 },
              quantity: item.quantity,
              variant,
            };
          })
        );
        setSelectedItems(itemsWithDetails);
      }
    } catch (error) {
      console.error("Error loading bundle items:", error);
    }
  };

  useEffect(() => {
    if (open) {
      const handleLoadListings = async () => {
        await loadListings();
      };
      handleLoadListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const fetchVariants = async () => {
      if (!selectedListingId) {
        setVariants([]);
        setSelectedVariantId("");
        return;
      }

      const { data, error } = await supabase
        .from("listing_variants")
        .select("variant_id, variant_name, price, sku, stock_quantity")
        .eq("listing_id", selectedListingId)
        .eq("is_available", true);

      if (!error && data) {
        setVariants(data);
        if (data.length === 1) {
          setSelectedVariantId(data[0].variant_id);
        } else {
          setSelectedVariantId("");
        }
      }
    };

    fetchVariants();
  }, [selectedListingId]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) {
        toast({
          title: "Error",
          description: "Seller profile not found",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("seller_product_listings")
        .select(
          `
          listing_id,
          seller_title,
          base_price,
          total_stock_quantity,
          listing_images(image_url, is_primary)
        `
        )
        .eq("seller_id", sellerId)
        .eq("status", "active");

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error loading listings:", error);
      toast({
        title: "Error",
        description: "Failed to load your products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addListingToBundle = () => {
    if (!selectedListingId) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive",
      });
      return;
    }

    if (variants.length > 0 && !selectedVariantId) {
      toast({
        title: "Error",
        description: "Please select a variant",
        variant: "destructive",
      });
      return;
    }

    if (quantity < 1) {
      toast({
        title: "Error",
        description: "Quantity must be at least 1",
        variant: "destructive",
      });
      return;
    }

    const listing = listings.find((l) => l.listing_id === selectedListingId);

    if (!listing) {
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive",
      });
      return;
    }

    const selectedVariant = variants.find(v => v.variant_id === selectedVariantId);

    // Check if already added (same listing AND same variant)
    const existingIndex = selectedItems.findIndex(
      (item) => item.listing.listing_id === selectedListingId &&
        ((!item.variant && !selectedVariantId) || (item.variant?.variant_id === selectedVariantId))
    );

    if (existingIndex >= 0) {
      const updatedItems = [...selectedItems];
      updatedItems[existingIndex].quantity = quantity;
      setSelectedItems(updatedItems);
    } else {
      const newItems = [
        ...selectedItems,
        {
          listing,
          quantity,
          variant: selectedVariant
        },
      ];
      setSelectedItems(newItems);
    }

    setSelectedListingId("");
    setSelectedVariantId("");
    setVariants([]);
    setQuantity(1);
  };

  const removeFromBundle = (listingId: string) => {
    setSelectedItems(selectedItems.filter((item) => item.listing.listing_id !== listingId));
  };

  const calculateTotalPrice = () => {
    const originalPrice = selectedItems.reduce(
      (sum, item) => sum + (item.variant?.price || item.listing.base_price) * item.quantity,
      0
    );
    const discountAmount = (originalPrice * discountPercentage) / 100;
    return originalPrice - discountAmount;
  };

  const getThumbnailUrl = () => {
    if (selectedItems.length === 0) return null;
    const images = selectedItems[0].listing.listing_images;
    if (!images || images.length === 0) return null;
    const primaryImage = images.find((img) => img.is_primary);
    return primaryImage?.image_url || images[0]?.image_url || null;
  };

  const generateSlug = (name: string) => {
    const baseSlug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .substring(0, 40);

    // Add timestamp to make slug unique
    const timestamp = Date.now().toString(36); // Convert timestamp to base36 for shorter string
    return `${baseSlug}-${timestamp}`;
  };

  const handleSubmit = async (submitStatus: "draft" | "active" = status) => {
    console.log("handleSubmit called with status:", submitStatus);

    if (selectedItems.length < 2) {
      toast({
        title: "Error",
        description: "Please select at least 2 products for the bundle",
        variant: "destructive",
      });
      return;
    }

    if (!bundleName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a bundle name",
        variant: "destructive",
      });
      return;
    }

    // Validate stock
    for (const item of selectedItems) {
      const requiredStock = item.quantity * bundleStock;
      const availableStock = item.variant ? item.variant.stock_quantity : item.listing.total_stock_quantity;

      if (requiredStock > availableStock) {
        toast({
          title: "Insufficient Stock",
          description: `Not enough stock for ${item.listing.seller_title}${item.variant ? ` (${item.variant.variant_name})` : ''}. Required: ${requiredStock}, Available: ${availableStock}`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setLoading(true);
      console.log("Getting authenticated seller ID...");
      const sellerId = await getAuthenticatedSellerId();
      console.log("Seller ID:", sellerId);

      if (!sellerId) {
        const errorMsg = "Seller not authenticated - no seller ID found";
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const originalPrice = selectedItems.reduce(
        (sum, item) => sum + (item.variant?.price || item.listing.base_price) * item.quantity,
        0
      );
      const finalPrice = calculateTotalPrice();
      const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

      // Prepare bundle payload
      const bundlePayload = {
        seller_id: sellerId,
        bundle_name: bundleName,
        description: description || null,
        base_price: originalPrice,
        discounted_price: finalPrice,
        discount_percentage: discountPercentage,
        total_stock_quantity: bundleStock,
        total_items: totalItems,
        status: submitStatus,
        published_at: submitStatus === "active" ? new Date().toISOString() : null,
        slug: generateSlug(bundleName),
        thumbnail_url: getThumbnailUrl(),
      };

      console.log("Bundle payload:", bundlePayload);

      let bundle;

      if (editingBundle) {
        // Update existing bundle
        const { data: updatedBundle, error: updateError } = await supabase
          .from("bundles")
          .update(bundlePayload)
          .eq("bundle_id", editingBundle.bundle_id)
          .select("bundle_id")
          .single();

        if (updateError) {
          console.error("Bundle update error:", updateError);
          throw updateError;
        }

        bundle = updatedBundle;

        // Delete old bundle items
        await supabase
          .from("bundle_items")
          .delete()
          .eq("bundle_id", editingBundle.bundle_id);
      } else {
        // Create new bundle
        const { data: newBundle, error: bundleError } = await supabase
          .from("bundles")
          .insert(bundlePayload)
          .select("bundle_id")
          .single();

        if (bundleError) {
          console.error("Bundle creation error details:", {
            message: bundleError.message,
            details: bundleError.details,
            hint: bundleError.hint,
            code: bundleError.code,
          });
          throw new Error(`Bundle creation failed: ${bundleError.message}`);
        }

        bundle = newBundle;
      }

      // Add/update bundle items
      const bundleItems = selectedItems.map((item) => {
        const itemPrice = (item.variant?.price || item.listing.base_price) * item.quantity;
        const allocation = originalPrice > 0 ? (itemPrice / originalPrice) * 100 : 0;

        return {
          bundle_id: bundle.bundle_id,
          listing_id: item.listing.listing_id,
          quantity: item.quantity,
          variant_id: item.variant?.variant_id || null,
          allocation_percentage: allocation
        };
      });

      console.log("Bundle items payload:", bundleItems);

      const { error: itemsError } = await supabase
        .from("bundle_items")
        .insert(bundleItems);

      if (itemsError) {
        console.error("Bundle items error:", itemsError);
        throw itemsError;
      }

      const action = editingBundle ? "updated" : "created";
      const statusText = submitStatus === "active" ? "published" : "saved as draft";
      toast({
        title: "Success",
        description: `Bundle "${bundleName}" ${action} and ${statusText}!`,
      });

      // Reset form
      setBundleName("");
      setDescription("");
      setDiscountPercentage(0);
      setBundleStock(0);
      setSelectedItems([]);
      setSelectedListingId("");
      setSelectedVariantId("");
      setVariants([]);
      setQuantity(1);
      setStatus("draft");
      onClose();
    } catch (error) {
      console.error("Error creating bundle:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create bundle",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingBundle ? 'Edit Bundle' : 'Create Bundle'}</DialogTitle>
          <DialogDescription>
            {editingBundle ? 'Update bundle details and products' : 'Combine 2 or more products into a discounted bundle'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Bundle Name */}
          <div className="grid gap-2">
            <Label htmlFor="bundle-name">Bundle Name *</Label>
            <Input
              id="bundle-name"
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              placeholder="e.g., Healthy Breakfast Bundle"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what makes this bundle special"
              rows={3}
            />
          </div>

          {/* Add Products Section */}
          <div className="grid gap-2 border-t pt-4">
            <Label>Add Products to Bundle</Label>
            <div className="space-y-2">
              <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading products..." : "Select a product"} />
                </SelectTrigger>
                <SelectContent>
                  {listings.map((listing) => (
                    <SelectItem key={listing.listing_id} value={listing.listing_id}>
                      {listing.seller_title} - ₹{listing.base_price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {variants.length > 0 && (
                <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((variant) => (
                      <SelectItem key={variant.variant_id} value={variant.variant_id}>
                        {variant.variant_name} - ₹{variant.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
                <Button
                  onClick={addListingToBundle}
                  disabled={!selectedListingId || loading}
                  className="self-end"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Selected Products */}
          {selectedItems.length > 0 && (
            <div className="grid gap-2 border-t pt-4">
              <Label>Products in Bundle ({selectedItems.length})</Label>
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div
                    key={item.listing.listing_id}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.listing.listing_images?.[0]?.image_url ? (
                          <img
                            src={item.listing.listing_images[0].image_url}
                            alt={item.listing.seller_title}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {item.listing.seller_title}
                            {item.variant && <span className="text-muted-foreground ml-1">({item.variant.variant_name})</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ₹{item.variant?.price || item.listing.base_price} × {item.quantity} = ₹
                            {((item.variant?.price || item.listing.base_price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromBundle(item.listing.listing_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discount and Stock */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="grid gap-2">
              <Label htmlFor="discount">Discount Percentage (%) *</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={discountPercentage}
                onChange={(e) =>
                  setDiscountPercentage(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bundle-stock">Bundle Stock *</Label>
              <Input
                id="bundle-stock"
                type="number"
                min="0"
                value={bundleStock}
                onChange={(e) =>
                  setBundleStock(Math.max(0, Number(e.target.value) || 0))
                }
              />
            </div>
          </div>

          {/* Price Summary */}
          {selectedItems.length > 0 && (
            <Card className="bg-muted/50 border-t pt-4">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Original Price:</span>
                  <span className="font-medium">
                    ₹
                    {selectedItems
                      .reduce((sum, item) => sum + (item.variant?.price || item.listing.base_price) * item.quantity, 0)
                      .toFixed(2)}
                  </span>
                </div>
                {discountPercentage > 0 && (
                  <div className="flex justify-between items-center text-destructive text-sm">
                    <span>Discount ({discountPercentage}%):</span>
                    <span>
                      -₹
                      {(
                        (selectedItems.reduce(
                          (sum, item) => sum + (item.variant?.price || item.listing.base_price) * item.quantity,
                          0
                        ) *
                          discountPercentage) /
                        100
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold text-primary border-t pt-2">
                  <span>Final Price:</span>
                  <span>₹{calculateTotalPrice().toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={selectedItems.length < 2 || !bundleName.trim() || loading}
            >
              👁️ Preview
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmit("draft")}
              disabled={selectedItems.length < 2 || !bundleName.trim() || loading}
            >
              {loading ? "Creating..." : "Save as Draft"}
            </Button>
            <Button
              onClick={() => handleSubmit("active")}
              disabled={selectedItems.length < 2 || !bundleName.trim() || loading}
            >
              {loading ? "Publishing..." : "Publish Now"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Bundle Preview Modal */}
      <BundlePreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        bundle={
          bundleName.trim() && selectedItems.length > 0
            ? {
              bundle_name: bundleName,
              description: description,
              base_price: selectedItems.reduce((sum, item) => sum + (item.variant?.price || item.listing.base_price) * item.quantity, 0),
              discounted_price: selectedItems.reduce((sum, item) => sum + (item.variant?.price || item.listing.base_price) * item.quantity, 0) * (1 - (discountPercentage / 100)),
              discount_percentage: discountPercentage,
              total_items: selectedItems.reduce((sum, item) => sum + item.quantity, 0),
              status: status,
              published_at: new Date().toISOString(),
              items: selectedItems,
            }
            : null
        }
      />
    </Dialog>
  );
}