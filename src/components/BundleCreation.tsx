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

interface Listing {
  listing_id: string;
  seller_title: string;
  base_price: number;
  listing_images?: Array<{ image_url: string; is_primary: boolean }>;
}

interface SelectedListingItem {
  listing: Listing;
  quantity: number;
}

interface BundleCreationProps {
  open: boolean;
  onClose: () => void;
  editingBundle?: Record<string, unknown>;
}

export function BundleCreation({ open, onClose, editingBundle }: BundleCreationProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedListingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [bundleName, setBundleName] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const { toast } = useToast();

  // Load editing bundle data
  useEffect(() => {
    const handleLoadBundle = async () => {
      if (editingBundle && open) {
        setBundleName(editingBundle.bundle_name as string);
        setDescription((editingBundle.description as string) || "");
        setDiscountPercentage((editingBundle.discount_percentage as number) || 0);
        setStatus((editingBundle.status as "draft" | "active") || "draft");
        // Load bundle items
        await loadBundleItems();
      } else if (open && !editingBundle) {
        // Reset for new bundle
        setBundleName("");
        setDescription("");
        setDiscountPercentage(0);
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
        .select("listing_id, quantity")
        .eq("bundle_id", editingBundle.bundle_id);

      if (error) throw error;

      if (data) {
        // Fetch listing details for each item
        const itemsWithDetails = await Promise.all(
          data.map(async (item) => {
            const { data: listing } = await supabase
              .from("seller_product_listings")
              .select("listing_id, seller_title, base_price, listing_images(image_url, is_primary)")
              .eq("listing_id", item.listing_id)
              .single();

            return {
              listing: listing || { listing_id: item.listing_id, seller_title: "Unknown", base_price: 0 },
              quantity: item.quantity,
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
    console.log("addListingToBundle called");
    console.log("selectedListingId:", selectedListingId);
    console.log("quantity:", quantity);
    console.log("listings:", listings);
    
    if (!selectedListingId) {
      toast({
        title: "Error",
        description: "Please select a product",
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
    console.log("Found listing:", listing);
    
    if (!listing) {
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive",
      });
      return;
    }

    // Check if already added
    const existingIndex = selectedItems.findIndex(
      (item) => item.listing.listing_id === selectedListingId
    );

    if (existingIndex >= 0) {
      const updatedItems = [...selectedItems];
      updatedItems[existingIndex].quantity = quantity;
      setSelectedItems(updatedItems);
      console.log("Updated existing item, new selectedItems:", updatedItems);
    } else {
      const newItems = [
        ...selectedItems,
        { listing, quantity },
      ];
      setSelectedItems(newItems);
      console.log("Added new item, new selectedItems:", newItems);
    }

    setSelectedListingId("");
    setQuantity(1);
  };

  const removeFromBundle = (listingId: string) => {
    setSelectedItems(selectedItems.filter((item) => item.listing.listing_id !== listingId));
  };

  const calculateTotalPrice = () => {
    const originalPrice = selectedItems.reduce(
      (sum, item) => sum + item.listing.base_price * item.quantity,
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
        (sum, item) => sum + item.listing.base_price * item.quantity,
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
        total_items: totalItems,
        status: submitStatus,
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
      const bundleItems = selectedItems.map((item) => ({
        bundle_id: bundle.bundle_id,
        listing_id: item.listing.listing_id,
        quantity: item.quantity,
      }));

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
      setSelectedItems([]);
      setSelectedListingId("");
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
          <DialogTitle>Create Product Bundle</DialogTitle>
          <DialogDescription>
            Combine 2 or more products into a discounted bundle
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
                          <p className="font-medium text-sm">{item.listing.seller_title}</p>
                          <p className="text-xs text-muted-foreground">
                            ₹{item.listing.base_price} × {item.quantity} = ₹
                            {(item.listing.base_price * item.quantity).toFixed(2)}
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

          {/* Discount */}
          <div className="grid gap-2 border-t pt-4">
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

          {/* Price Summary */}
          {selectedItems.length > 0 && (
            <Card className="bg-muted/50 border-t pt-4">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Original Price:</span>
                  <span className="font-medium">
                    ₹
                    {selectedItems
                      .reduce((sum, item) => sum + item.listing.base_price * item.quantity, 0)
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
                          (sum, item) => sum + item.listing.base_price * item.quantity,
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
    </Dialog>
  );
}