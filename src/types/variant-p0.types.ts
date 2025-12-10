/**
 * TypeScript Interfaces for Variant P0 Fields
 * Amazon-Style Product Variant Compliance
 */

import type { Json } from "@/integrations/supabase/database.types";

// ============================================
// P0 Compliance Types
// ============================================

export interface NutrientValue {
  value: number;
  unit: string;
}

export interface MacronutrientBreakdown {
  protein: NutrientValue;
  carbohydrate: NutrientValue & { ofWhichSugars?: number };
  fat: NutrientValue & { saturated?: number; trans?: number };
}

export interface MicronutrientBreakdown {
  sodium?: NutrientValue;
  calcium?: NutrientValue;
  iron?: NutrientValue;
  zinc?: NutrientValue;
  vitaminA?: NutrientValue;
  vitaminC?: NutrientValue;
  vitaminD?: NutrientValue;
  vitaminE?: NutrientValue;
  vitaminB6?: NutrientValue;
  vitaminB12?: NutrientValue;
  magnesium?: NutrientValue;
  phosphorus?: NutrientValue;
  potassium?: NutrientValue;
  // Add more as needed
}

export interface NutrientBreakdown {
  servingSize: string; // e.g., "100g", "1 cup (240ml)"
  energyKcal: number;
  energyKj?: number;
  macronutrients: MacronutrientBreakdown;
  micronutrients?: MicronutrientBreakdown;
  fiber?: NutrientValue;
  cholesterol?: NutrientValue;
}

export interface VariantP0Images {
  product_image_url: string; // Main product photo
  ingredient_image_url: string; // Ingredient list label
  nutrient_table_image_url: string; // Nutrition facts label
  fssai_label_image_url: string; // FSSAI certificate
}

export interface VariantP0Fields extends VariantP0Images {
  // JSON fields (stored as JSONB in database)
  ingredient_list: Json | string; // Complete ingredient list as JSON or string for forms
  fssai_number: string; // 14-digit FSSAI number
  
  // Dates
  expiry_date: string; // Product expiry date (ISO format)
  fssai_expiry_date?: string; // FSSAI license expiry (ISO format)
  
  // Nutrient data
  nutrient_breakdown: NutrientBreakdown;
  
  // Attestation
  accuracy_attested: boolean; // Must be true to save
  attested_by?: string; // Seller UUID
  attested_at?: string; // ISO timestamp
}

export interface VariantWithP0 extends VariantP0Fields {
  variant_id: string;
  listing_id: string;
  sku: string;
  variant_name?: string;
  size?: string;
  flavor?: string;
  serving_count?: number;
  price: number;
  original_price?: number;
  stock_quantity: number;
  reserved_quantity?: number;
  manufacture_date?: string;
  batch_number?: string;
  health_score?: number;
  is_available: boolean;
  is_p0_compliant?: boolean; // Auto-computed
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Form State Types
// ============================================

export interface VariantP0FormState {
  // Images
  productImage: File | null;
  ingredientImage: File | null;
  nutrientImage: File | null;
  fssaiImage: File | null;
  
  // URLs (for existing variants)
  productImageUrl?: string;
  ingredientImageUrl?: string;
  nutrientImageUrl?: string;
  fssaiImageUrl?: string;
  
  // Text fields
  ingredientList: string;
  allergenInfo: string;
  fssaiNumber: string;
  
  // Dates
  expiryDate: string;
  fssaiExpiryDate?: string;
  
  // Nutrient data
  nutrientBreakdown: NutrientBreakdown;
  
  // Attestation
  accuracyAttested: boolean;
}

export interface VariantFormWithP0 extends VariantP0FormState {
  // Basic variant fields
  variantName?: string;
  sku: string;
  size?: string;
  flavor?: string;
  servingCount?: number;
  price: number;
  originalPrice?: number;
  stockQuantity: number;
  manufactureDate?: string;
  batchNumber?: string;
  isAvailable: boolean;
}

// ============================================
// API Response Types
// ============================================

export interface VariantCompleteDetails {
  variant_id: string;
  listing_id: string;
  variant_name?: string;
  sku: string;
  price: number;
  original_price?: number;
  stock_quantity: number;
  is_available: boolean;
  
  // Product info
  size?: string;
  flavor?: string;
  serving_count?: number;
  
  // P0 Images
  product_image_url?: string;
  ingredient_image_url?: string;
  nutrient_table_image_url?: string;
  fssai_label_image_url?: string;
  
  // P0 Compliance
  fssai_number?: string;
  fssai_expiry_date?: string;
  expiry_date?: string;
  ingredient_list?: Json | string;
  nutrient_breakdown?: NutrientBreakdown;
  
  // Attestation
  accuracy_attested?: boolean;
  attested_by?: string;
  attested_at?: string;
  is_p0_compliant?: boolean;
  
  // Listing info
  seller_id?: string;
  seller_title?: string;
  seller_description?: string;
  business_name?: string;
  rating?: number;
  review_count?: number;
  listing_status?: string;
  
  // Dates
  created_at?: string;
  updated_at?: string;
}

export interface VariantEditLog {
  log_id: string;
  variant_id: string;
  changed_by: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  change_type?: string;
  changed_at: string;
  ip_address?: string;
  user_agent?: string;
}

// ============================================
// Validation Types
// ============================================

export interface P0ValidationError {
  field: keyof VariantP0Fields;
  message: string;
}

export interface P0ValidationResult {
  isValid: boolean;
  errors: P0ValidationError[];
  missingFields: string[];
}

// ============================================
// Component Props Types
// ============================================

export interface P0ImageUploadProps {
  label: string;
  description?: string;
  required?: boolean;
  currentUrl?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  imageType: 'product' | 'ingredient' | 'nutrient' | 'fssai';
  error?: string;
}

export interface NutrientFormProps {
  value: NutrientBreakdown;
  onChange: (data: NutrientBreakdown) => void;
  errors?: Record<string, string>;
}

export interface VariantP0FormProps {
  value: VariantP0FormState;
  onChange: (data: Partial<VariantP0FormState>) => void;
  errors?: Record<string, string>;
  showImagePreviews?: boolean;
}

export interface VariantTabsProps {
  variant: VariantCompleteDetails;
  isOwner: boolean;
  onRestock?: (quantity: number) => void;
  onEdit?: () => void;
}

export interface P0ComplianceBadgeProps {
  isCompliant: boolean;
  missingFields?: string[];
  size?: 'sm' | 'md' | 'lg';
}

// ============================================
// Helper Functions Type Definitions
// ============================================

export type ValidateP0Fields = (data: Partial<VariantP0Fields>) => P0ValidationResult;

export type UploadP0Images = (
  variantId: string,
  listingId: string,
  sellerId: string,
  images: {
    product?: File;
    ingredient?: File;
    nutrient?: File;
    fssai?: File;
  }
) => Promise<VariantP0Images>;

export type FormatNutrientDisplay = (nutrient: NutrientBreakdown) => React.ReactNode;

export type GetVariantEditHistory = (variantId: string) => Promise<VariantEditLog[]>;

// ============================================
// Constants
// ============================================

export const P0_IMAGE_TYPES = {
  PRODUCT: 'product' as const,
  INGREDIENT: 'ingredient' as const,
  NUTRIENT: 'nutrient' as const,
  FSSAI: 'fssai' as const,
};

export const P0_IMAGE_LABELS = {
  [P0_IMAGE_TYPES.PRODUCT]: 'Product Photo',
  [P0_IMAGE_TYPES.INGREDIENT]: 'Ingredient Label',
  [P0_IMAGE_TYPES.NUTRIENT]: 'Nutrition Facts',
  [P0_IMAGE_TYPES.FSSAI]: 'FSSAI Certificate',
};

export const P0_IMAGE_DESCRIPTIONS = {
  [P0_IMAGE_TYPES.PRODUCT]: 'Clear photo of the product',
  [P0_IMAGE_TYPES.INGREDIENT]: 'Photo showing the ingredient list on the package',
  [P0_IMAGE_TYPES.NUTRIENT]: 'Photo showing the nutrition facts table',
  [P0_IMAGE_TYPES.FSSAI]: 'Photo of your FSSAI license certificate',
};

export const COMMON_ALLERGENS = [
  'NA',
  'Milk',
  'Eggs',
  'Fish',
  'Shellfish',
  'Tree Nuts',
  'Peanuts',
  'Wheat',
  'Soybeans',
  'Sesame',
  'Mustard',
  'Celery',
  'Gluten',
  'Sulfites',
];

export const NUTRIENT_UNITS = {
  GRAMS: 'g',
  MILLIGRAMS: 'mg',
  MICROGRAMS: 'mcg',
  KILOCALORIES: 'kcal',
  KILOJOULES: 'kJ',
};

// ============================================
// Default Values
// ============================================

export const DEFAULT_NUTRIENT_BREAKDOWN: NutrientBreakdown = {
  servingSize: '100g',
  energyKcal: 0,
  energyKj: 0,
  macronutrients: {
    protein: { value: 0, unit: 'g' },
    carbohydrate: { value: 0, unit: 'g', ofWhichSugars: 0 },
    fat: { value: 0, unit: 'g', saturated: 0, trans: 0 },
  },
  micronutrients: {},
  fiber: { value: 0, unit: 'g' },
  cholesterol: { value: 0, unit: 'mg' },
};

export const DEFAULT_P0_FORM_STATE: VariantP0FormState = {
  productImage: null,
  ingredientImage: null,
  nutrientImage: null,
  fssaiImage: null,
  ingredientList: '',
  allergenInfo: 'NA',
  fssaiNumber: '',
  expiryDate: '',
  nutrientBreakdown: DEFAULT_NUTRIENT_BREAKDOWN,
  accuracyAttested: false,
};

// ============================================
// Utility Types
// ============================================

export type P0FieldStatus = 'complete' | 'incomplete' | 'invalid';

export interface P0FieldStatusMap {
  product_image: P0FieldStatus;
  ingredient_image: P0FieldStatus;
  nutrient_image: P0FieldStatus;
  fssai_image: P0FieldStatus;
  ingredient_list: P0FieldStatus;
  allergen_info: P0FieldStatus;
  fssai_number: P0FieldStatus;
  expiry_date: P0FieldStatus;
  nutrient_breakdown: P0FieldStatus;
  accuracy_attested: P0FieldStatus;
}
