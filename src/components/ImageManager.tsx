import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Trash2, Copy, Edit, Star, StarOff, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedSellerId } from "@/lib/seller-helpers";

interface ProductImage {
  image_id: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order?: number;
  listing_id: string;
  variant_id?: string;
  created_at: string;
}

interface ImageManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageManager({ open, onOpenChange }: ImageManagerProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<ProductImage | null>(null);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [newAltText, setNewAltText] = useState("");

  useEffect(() => {
    if (open) {
      loadImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const sellerId = await getAuthenticatedSellerId();
      if (!sellerId) {
        toast({
          title: "Authentication Error",
          description: "Please log in to manage images",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      setSellerId(sellerId);

      // Get all images for this seller's products
      const { data, error } = await supabase
        .from("listing_images")
        .select(`
          *,
          seller_product_listings!inner(seller_id)
        `)
        .eq("seller_product_listings.seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Error loading images:", error);
      toast({
        title: "Error",
        description: "Failed to load images",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from("listing_images")
        .delete()
        .eq("image_id", imageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
      
      setDeleteImageId(null);
      loadImages();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Success",
        description: "Image URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleSetPrimary = async (imageId: string, listingId: string) => {
    try {
      // First, remove primary status from all images for this listing
      await supabase
        .from("listing_images")
        .update({ is_primary: false })
        .eq("listing_id", listingId);

      // Then set the selected image as primary
      const { error } = await supabase
        .from("listing_images")
        .update({ is_primary: true })
        .eq("image_id", imageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Primary image updated",
      });
      
      loadImages();
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: "Failed to update primary image",
        variant: "destructive",
      });
    }
  };

  const handleUpdateAltText = async () => {
    if (!editingImage) return;

    try {
      const { error } = await supabase
        .from("listing_images")
        .update({ alt_text: newAltText })
        .eq("image_id", editingImage.image_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Alt text updated successfully",
      });
      
      setEditingImage(null);
      setNewAltText("");
      loadImages();
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: "Failed to update alt text",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Image Library Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Images Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Your Product Images ({images.length})</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload images through the Add/Edit Product dialog
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading images...</p>
                </div>
              ) : images.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No images uploaded yet</p>
                  <p className="text-sm text-muted-foreground">
                    Images will appear here when you add products with photos
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {images.map((image) => (
                    <Card key={image.image_id} className="overflow-hidden">
                      <div className="aspect-square relative">
                        <img
                          src={image.image_url}
                          alt={image.alt_text || "Product image"}
                          className="w-full h-full object-cover"
                        />
                        {image.is_primary && (
                          <Badge className="absolute top-2 left-2 bg-yellow-500">
                            <Star className="h-3 w-3 mr-1" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      
                      <CardContent className="p-3 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyUrl(image.image_url)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy URL
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingImage(image);
                              setNewAltText(image.alt_text || "");
                            }}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          
                          {!image.is_primary && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetPrimary(image.image_id, image.listing_id)}
                            >
                              <StarOff className="h-3 w-3 mr-1" />
                              Set Primary
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteImageId(image.image_id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {image.alt_text && (
                          <p className="text-xs text-muted-foreground truncate">
                            Alt: {image.alt_text}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Alt Text Dialog */}
        <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Image Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="alt-text">Alt Text</Label>
                <Input
                  id="alt-text"
                  value={newAltText}
                  onChange={(e) => setNewAltText(e.target.value)}
                  placeholder="Describe the image for accessibility"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateAltText}>
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingImage(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteImageId} onOpenChange={() => setDeleteImageId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Image</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this image? This action cannot be undone.
                The image will be removed from the product.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteImageId && handleDelete(deleteImageId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Image
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
