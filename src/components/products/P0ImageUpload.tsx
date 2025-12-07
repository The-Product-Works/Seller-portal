/**
 * P0 Image Upload Component
 * Handles upload of mandatory product images (product, ingredient, nutrient, FSSAI)
 */

import React, { useRef, useState } from 'react';
import { Upload, X, Eye, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  P0_IMAGE_TYPES,
  P0_IMAGE_LABELS,
  P0_IMAGE_DESCRIPTIONS,
  type P0ImageUploadProps,
} from '@/types/variant-p0.types';

export function P0ImageUpload({
  label,
  description,
  required = true,
  currentUrl,
  file,
  onFileChange,
  imageType,
  error,
}: P0ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }

      onFileChange(selectedFile);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleRemove = () => {
    onFileChange(null);
    setPreview(currentUrl || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasImage = file || currentUrl;

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
        {hasImage && !error && (
          <Check className="h-4 w-4 text-green-500" />
        )}
        {error && (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}
      </Label>
      
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <div className={cn(
        "border-2 border-dashed rounded-lg p-4 transition-colors",
        error ? "border-red-300 bg-red-50" : "border-gray-300 hover:border-gray-400",
        hasImage && "border-solid border-green-300 bg-green-50"
      )}>
        {preview ? (
          <div className="space-y-3">
            {/* Preview Image */}
            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-gray-100">
              <img
                src={preview}
                alt={label}
                className="h-full w-full object-contain"
              />
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowPreviewModal(true)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Change
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleRemove}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>

            {/* File info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {file ? file.name : 'Current image'}
              </span>
              {file && (
                <span className="text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Upload className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              Click to upload {label.toLowerCase()}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              PNG, JPG up to 5MB
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose File
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Full-size preview modal */}
      {showPreviewModal && preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={preview}
              alt={label}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
            <Button
              className="absolute top-4 right-4"
              variant="secondary"
              size="icon"
              onClick={() => setShowPreviewModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * P0 Images Section - All 4 mandatory images
 */
interface P0ImagesSectionProps {
  productImage: File | null;
  ingredientImage: File | null;
  nutrientImage: File | null;
  fssaiImage: File | null;
  productImageUrl?: string;
  ingredientImageUrl?: string;
  nutrientImageUrl?: string;
  fssaiImageUrl?: string;
  onProductImageChange: (file: File | null) => void;
  onIngredientImageChange: (file: File | null) => void;
  onNutrientImageChange: (file: File | null) => void;
  onFssaiImageChange: (file: File | null) => void;
  errors?: Record<string, string>;
}

export function P0ImagesSection({
  productImage,
  ingredientImage,
  nutrientImage,
  fssaiImage,
  productImageUrl,
  ingredientImageUrl,
  nutrientImageUrl,
  fssaiImageUrl,
  onProductImageChange,
  onIngredientImageChange,
  onNutrientImageChange,
  onFssaiImageChange,
  errors = {},
}: P0ImagesSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Upload className="h-5 w-5" />
        <h3 className="text-lg font-semibold">P0 Mandatory Images</h3>
        <span className="text-sm text-muted-foreground">
          (4 images required)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <P0ImageUpload
          label={P0_IMAGE_LABELS[P0_IMAGE_TYPES.PRODUCT]}
          description={P0_IMAGE_DESCRIPTIONS[P0_IMAGE_TYPES.PRODUCT]}
          required
          currentUrl={productImageUrl}
          file={productImage}
          onFileChange={onProductImageChange}
          imageType={P0_IMAGE_TYPES.PRODUCT}
          error={errors.product_image}
        />

        <P0ImageUpload
          label={P0_IMAGE_LABELS[P0_IMAGE_TYPES.INGREDIENT]}
          description={P0_IMAGE_DESCRIPTIONS[P0_IMAGE_TYPES.INGREDIENT]}
          required
          currentUrl={ingredientImageUrl}
          file={ingredientImage}
          onFileChange={onIngredientImageChange}
          imageType={P0_IMAGE_TYPES.INGREDIENT}
          error={errors.ingredient_image}
        />

        <P0ImageUpload
          label={P0_IMAGE_LABELS[P0_IMAGE_TYPES.NUTRIENT]}
          description={P0_IMAGE_DESCRIPTIONS[P0_IMAGE_TYPES.NUTRIENT]}
          required
          currentUrl={nutrientImageUrl}
          file={nutrientImage}
          onFileChange={onNutrientImageChange}
          imageType={P0_IMAGE_TYPES.NUTRIENT}
          error={errors.nutrient_image}
        />

        <P0ImageUpload
          label={P0_IMAGE_LABELS[P0_IMAGE_TYPES.FSSAI]}
          description={P0_IMAGE_DESCRIPTIONS[P0_IMAGE_TYPES.FSSAI]}
          required
          currentUrl={fssaiImageUrl}
          file={fssaiImage}
          onFileChange={onFssaiImageChange}
          imageType={P0_IMAGE_TYPES.FSSAI}
          error={errors.fssai_image}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> All images should be clear, well-lit, and readable. 
          Product photos should show the actual item, not stock images.
        </p>
      </div>
    </div>
  );
}
