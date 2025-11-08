import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface BundleItem {
  listing: {
    seller_title: string;
    base_price: number;
    listing_images?: Array<{ image_url: string }>;
  };
  quantity: number;
}

interface BundlePreviewData {
  bundle_name: string;
  description?: string;
  base_price: number;
  discounted_price?: number;
  discount_percentage?: number;
  total_items: number;
  status: 'draft' | 'active';
  published_at?: string;
  thumbnail_url?: string;
  items?: BundleItem[];
}

interface BundlePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle: BundlePreviewData | null;
}

export function BundlePreviewModal({
  open,
  onOpenChange,
  bundle,
}: BundlePreviewModalProps) {
  if (!bundle) return null;

  const discountPercentage =
    bundle.discount_percentage ||
    (bundle.base_price && bundle.discounted_price
      ? Math.round(
          ((bundle.base_price - bundle.discounted_price) / bundle.base_price) * 100
        )
      : 0);

  const savings =
    bundle.base_price - (bundle.discounted_price || bundle.base_price);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bundle Preview</DialogTitle>
          <DialogDescription>
            This is how your bundle will appear to customers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bundle Thumbnail */}
          {bundle.thumbnail_url ? (
            <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square">
              <img
                src={bundle.thumbnail_url}
                alt={bundle.bundle_name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center">
              <span className="text-muted-foreground">No thumbnail</span>
            </div>
          )}

          {/* Bundle Details */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">{bundle.bundle_name}</h2>
              <div className="flex items-center gap-2 mb-3">
                <Badge
                  variant={bundle.status === 'active' ? 'default' : 'secondary'}
                >
                  {bundle.status === 'active' ? '✓ Published' : '📋 Draft'}
                </Badge>
                <Badge variant="outline">{bundle.total_items} items</Badge>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  {bundle.discounted_price &&
                  bundle.discounted_price < bundle.base_price ? (
                    <>
                      <span className="text-3xl font-bold text-blue-600">
                        ₹{bundle.discounted_price.toFixed(2)}
                      </span>
                      <span className="text-lg text-gray-500 line-through">
                        ₹{bundle.base_price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-blue-600">
                      ₹{bundle.base_price.toFixed(2)}
                    </span>
                  )}
                </div>

                {discountPercentage > 0 && (
                  <div className="bg-red-100 border border-red-200 rounded p-2">
                    <p className="text-red-800 font-semibold">
                      🎉 Save ₹{savings.toFixed(2)} ({discountPercentage}% off)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {bundle.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {bundle.description}
                </p>
              </div>
            )}

            {/* Bundle Items */}
            <div>
              <h3 className="font-semibold mb-3">Bundle Includes</h3>
              <div className="space-y-3">
                {bundle.items && bundle.items.length > 0 ? (
                  bundle.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-3 flex gap-3"
                    >
                      {/* Item Image */}
                      {item.listing.listing_images &&
                        item.listing.listing_images.length > 0 && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img
                              src={item.listing.listing_images[0].image_url}
                              alt={item.listing.seller_title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.listing.seller_title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} × ₹{item.listing.base_price.toFixed(2)}
                        </p>
                        <p className="text-sm font-semibold text-blue-600 mt-1">
                          ₹{(item.quantity * item.listing.base_price).toFixed(2)}
                        </p>
                      </div>

                      {/* Check Icon */}
                      <div className="flex items-center">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No items added to this bundle yet
                  </p>
                )}
              </div>
            </div>

            {/* Value Proposition */}
            {bundle.items && bundle.items.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-900 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Complete Bundle Value
                </p>
                <p className="text-sm text-green-800 mt-2">
                  Get all {bundle.total_items} items together for{' '}
                  <span className="font-bold">₹{bundle.discounted_price?.toFixed(2) || bundle.base_price.toFixed(2)}</span>
                  {discountPercentage > 0 && (
                    <span> - Save {discountPercentage}%!</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
