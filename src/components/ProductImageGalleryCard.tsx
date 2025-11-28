import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductImage {
  image_id: string;
  image_url: string;
  is_primary?: boolean;
}

interface ProductImageGalleryCardProps {
  images: ProductImage[] | undefined;
  productName: string;
  className?: string;
}

export function ProductImageGalleryCard({
  images,
  productName,
  className = '',
}: ProductImageGalleryCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Filter valid images
  const validImages = images?.filter(img => img.image_url) || [];
  const currentImage = validImages[currentImageIndex];
  const hasMultipleImages = validImages.length > 1;

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? validImages.length - 1 : prev - 1
    );
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === validImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className={`relative bg-muted overflow-hidden group ${className}`}>
      {/* Main Image */}
      {currentImage?.image_url ? (
        <>
          <img
            src={currentImage.image_url}
            alt={productName}
            className="object-cover w-full h-full"
          />
          
          {/* Image Counter */}
          {hasMultipleImages && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              {currentImageIndex + 1}/{validImages.length}
            </div>
          )}

          {/* Navigation Arrows - Only show if multiple images */}
          {hasMultipleImages && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={goToNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* Image Indicators */}
              <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {validImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(index);
                    }}
                    title={`Go to image ${index + 1}`}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex
                        ? 'bg-white w-3'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-full bg-muted">
          <Package className="h-16 w-16 text-muted-foreground" />
        </div>
      )}

      {/* Horizontal Thumbnail Scroller */}
      {hasMultipleImages && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {validImages.map((image, index) => (
              <button
                key={image.image_id}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden transition-all ${
                  index === currentImageIndex
                    ? 'border-white shadow-lg scale-110'
                    : 'border-white/50 hover:border-white/75'
                }`}
                title={`View image ${index + 1}`}
              >
                <img
                  src={image.image_url}
                  alt={`${productName} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
