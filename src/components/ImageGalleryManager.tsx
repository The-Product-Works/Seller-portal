import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Upload, GripVertical, Check } from 'lucide-react';

export interface ImageFile {
  id: string;
  file?: File;
  url?: string;
  isPrimary: boolean;
  altText: string;
  isExisting?: boolean;
}

interface ImageGalleryManagerProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  onImageUpload?: (files: File[]) => void;
  maxImages?: number;
}

export function ImageGalleryManager({
  images,
  onImagesChange,
  onImageUpload,
  maxImages = 10,
}: ImageGalleryManagerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
  };

  const addImages = (files: File[]) => {
    const remainingSlots = maxImages - images.length;

    if (files.length > remainingSlots) {
      alert(`You can only add ${remainingSlots} more image(s)`);
      return;
    }

    const newImages: ImageFile[] = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      file,
      isPrimary: images.length === 0 && index === 0,
      altText: '',
    }));

    const updatedImages = [...images, ...newImages];
    onImagesChange(updatedImages);

    if (onImageUpload) {
      onImageUpload(files);
    }
  };

  const handleDragOverUpload = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverUpload(true);
  };

  const handleDragLeaveUpload = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverUpload(false);
  };

  const handleDropUpload = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverUpload(false);
    
    const files = Array.from(e.dataTransfer.files || []).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      addImages(files as File[]);
    }
  };

  const handleRemoveImage = (id: string) => {
    const updatedImages = images.filter(img => img.id !== id);
    
    // If removed image was primary, make the first one primary
    if (updatedImages.length > 0 && images.find(img => img.id === id)?.isPrimary) {
      updatedImages[0].isPrimary = true;
    }

    onImagesChange(updatedImages);
  };

  const handleSetPrimary = (id: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === id,
    }));
    onImagesChange(updatedImages);
  };

  const handleAltTextChange = (id: string, altText: string) => {
    const updatedImages = images.map(img =>
      img.id === id ? { ...img, altText } : img
    );
    onImagesChange(updatedImages);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    onImagesChange(newImages);
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold mb-2 block">Product Images</Label>
        <p className="text-sm text-muted-foreground mb-2">
          {images.length} / {maxImages} images added
        </p>
      </div>

      {/* Upload Area */}
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOverUpload 
            ? 'bg-blue-50 border-blue-400' 
            : 'hover:bg-accent/50 border-gray-300'
        } ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOverUpload}
        onDragLeave={handleDragLeaveUpload}
        onDrop={handleDropUpload}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          disabled={images.length >= maxImages}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className={`${images.length >= maxImages ? 'cursor-not-allowed' : 'cursor-pointer'} flex flex-col items-center gap-2`}
        >
          <Upload className={`h-8 w-8 ${isDragOverUpload ? 'text-blue-500' : 'text-muted-foreground'}`} />
          <div>
            <p className="font-medium">
              {images.length >= maxImages ? 'Maximum images reached' : isDragOverUpload ? 'Drop images here' : 'Click to upload or drag images'}
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP up to {maxImages} images
            </p>
          </div>
        </label>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Added Images</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-move ${
                  draggedIndex === index ? 'opacity-50' : ''
                } ${image.isPrimary ? 'border-blue-500 border-solid' : 'border-gray-200'}`}
              >
                {/* Image Preview */}
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {image.file ? (
                    <img
                      src={URL.createObjectURL(image.file)}
                      alt={image.altText || 'Product image'}
                      className="w-full h-full object-cover"
                    />
                  ) : image.url ? (
                    <img
                      src={image.url}
                      alt={image.altText || 'Product image'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <span className="text-xs text-muted-foreground">No image</span>
                    </div>
                  )}
                </div>

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  {!image.isPrimary && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetPrimary(image.id)}
                      className="w-full"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Set Primary
                    </Button>
                  )}
                  {image.isPrimary && (
                    <div className="text-xs text-white font-medium bg-blue-500 px-2 py-1 rounded">
                      Primary Image
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveImage(image.id)}
                    className="w-full"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>

                {/* Drag Handle */}
                <div className="absolute top-1 left-1 bg-white/80 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4 text-gray-600" />
                </div>
              </div>
            ))}
          </div>

          {/* Alt Text Inputs */}
          <div className="space-y-2 mt-4 p-3 bg-accent/30 rounded-lg">
            <Label className="text-sm font-medium">Image Descriptions (Alt Text)</Label>
            <div className="space-y-2">
              {images.map((image) => (
                <div key={image.id}>
                  <label className="text-xs text-muted-foreground">
                    {image.isPrimary ? '⭐ Primary - ' : ''}
                    {image.file?.name || 'Existing image'}
                  </label>
                  <Input
                    placeholder="Describe this image..."
                    value={image.altText}
                    onChange={(e) => handleAltTextChange(image.id, e.target.value)}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Message */}
      <p className="text-xs text-muted-foreground italic">
        💡 Drag images to reorder, click to set as primary image. First image will be used as product thumbnail.
      </p>
    </div>
  );
}
