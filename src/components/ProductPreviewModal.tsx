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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface ProductPreviewData {
  seller_title: string;
  seller_description: string;
  seller_ingredients?: string;
  base_price?: number;
  discounted_price?: number;
  discount_percentage?: number;
  return_policy?: string;
  shipping_info?: string;
  shelf_life_months?: number;
  health_score?: number;
  status: 'draft' | 'active';
  published_at?: string;
  manufacturing_info?: string;
  certificates?: {
    regular: number;
    trust: number;
    total: number;
  };
  images?: Array<{ image_url: string; is_primary: boolean }>;
  variants?: Array<{
    variant_name?: string;
    flavor?: string;
    size?: string;
    price: number;
    stock_quantity: number;
    nutritional_info?: Record<string, unknown>;
    manufacture_date?: string;
  }>;
}

interface ProductPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductPreviewData | null;
}

export function ProductPreviewModal({
  open,
  onOpenChange,
  product,
}: ProductPreviewModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!product) return null;

  const primaryImage =
    product.images?.find((img) => img.is_primary) || product.images?.[0];
  const imageUrl = primaryImage?.image_url;

  const discountPercentage =
    product.discount_percentage ||
    (product.base_price && product.discounted_price
      ? Math.round(
          ((product.base_price - product.discounted_price) /
            product.base_price) *
            100
        )
      : 0);

  const nextImage = () => {
    if (product.images) {
      setCurrentImageIndex((prev) => (prev + 1) % product.images!.length);
    }
  };

  const prevImage = () => {
    if (product.images) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? product.images!.length - 1 : prev - 1
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product Preview</DialogTitle>
          <DialogDescription>
            This is how your product will appear to customers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Gallery */}
          {product.images && product.images.length > 0 ? (
            <div className="space-y-3">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square">
                <img
                  src={product.images[currentImageIndex].image_url}
                  alt={product.seller_title}
                  className="w-full h-full object-cover"
                />
                {product.images.length > 1 && (
                  <>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {discountPercentage > 0 && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded font-semibold">
                    {discountPercentage}% OFF
                  </div>
                )}
              </div>

              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-16 h-16 rounded border-2 overflow-hidden flex-shrink-0 transition-all ${
                        currentImageIndex === idx
                          ? 'border-blue-500'
                          : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={img.image_url}
                        alt={`Product ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center">
              <span className="text-muted-foreground">No images added</span>
            </div>
          )}

          {/* Product Details */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">{product.seller_title}</h2>
              <div className="flex items-center gap-2 mb-3">
                <Badge
                  variant={product.status === 'active' ? 'default' : 'secondary'}
                >
                  {product.status === 'active' ? '✓ Published' : '📋 Draft'}
                </Badge>
                {product.health_score && (
                  <Badge variant="outline">
                    Health Score: {product.health_score}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Pricing */}
            {product.base_price !== undefined && (
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-baseline gap-2">
                  {product.discounted_price && product.discounted_price < product.base_price ? (
                    <>
                      <span className="text-2xl font-bold text-blue-600">
                        ₹{product.discounted_price.toFixed(2)}
                      </span>
                      <span className="text-lg text-gray-500 line-through">
                        ₹{product.base_price.toFixed(2)}
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        Save ₹{(product.base_price - product.discounted_price).toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-blue-600">
                      ₹{product.base_price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {product.seller_description}
              </p>
            </div>

            {/* Ingredients */}
            {product.seller_ingredients && (
              <div>
                <h3 className="font-semibold mb-2">Ingredients</h3>
                <p className="text-sm text-muted-foreground">
                  {product.seller_ingredients}
                </p>
              </div>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Available Variants</h3>
                <div className="space-y-2">
                  {product.variants.map((variant, idx) => {
                    return (
                      <div
                        key={idx}
                        className="border rounded-lg p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {variant.variant_name || 'Variant'}
                            {variant.size && ` (${variant.size})`}
                            {variant.flavor && ` - ${variant.flavor}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Stock: {variant.stock_quantity} | Price: ₹{variant.price}
                            {variant.manufacture_date && ` | Mfg: ${new Date(variant.manufacture_date).toLocaleDateString()}`}
                          </p>
                          {variant.nutritional_info &&
                            Object.keys(variant.nutritional_info).length > 0 && (
                              <p className="text-xs text-blue-600 mt-1">
                                ✓ Nutritional info available
                              </p>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manufacturing Information */}
            {product.manufacturing_info && (
              <div>
                <h3 className="font-semibold mb-2">Manufacturing Information</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {product.manufacturing_info}
                </p>
              </div>
            )}

            {/* Certificates */}
            {product.certificates && product.certificates.total > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Certificates & Documentation</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <span className="text-lg">✓</span>
                    <div>
                      <p className="font-medium">Certified Product</p>
                      <p className="text-sm">
                        {product.certificates.regular > 0 && `${product.certificates.regular} quality certificate(s)`}
                        {product.certificates.regular > 0 && product.certificates.trust > 0 && ' • '}
                        {product.certificates.trust > 0 && `${product.certificates.trust} trust certificate(s)`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Policies */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {product.return_policy && (
                <div className="border rounded-lg p-3">
                  <p className="font-semibold mb-1">Return Policy</p>
                  <p className="text-muted-foreground">{product.return_policy}</p>
                </div>
              )}
              {product.shipping_info && (
                <div className="border rounded-lg p-3">
                  <p className="font-semibold mb-1">Shipping</p>
                  <p className="text-muted-foreground">{product.shipping_info}</p>
                </div>
              )}
              {product.shelf_life_months && (
                <div className="border rounded-lg p-3">
                  <p className="font-semibold mb-1">Shelf Life</p>
                  <p className="text-muted-foreground">
                    {product.shelf_life_months} months
                  </p>
                </div>
              )}
            </div>
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
