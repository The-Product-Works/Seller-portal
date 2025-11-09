import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FilterOptions {
  allergens: string[];
  variants: string[];
  priceRange: {
    min: number;
    max: number;
  };
  stockRange: {
    min: number;
    max: number;
  };
}

export function useFilterOptions() {
  const [options, setOptions] = useState<FilterOptions>({
    allergens: [],
    variants: [],
    priceRange: { min: 0, max: 0 },
    stockRange: { min: 0, max: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFilterOptions() {
      try {
        // Fetch all unique allergens from all products
        const { data: products } = await supabase
          .from('seller_product_listings')
          .select('seller_title');

        const allAllergens = new Set<string>();
        const allVariants = new Set<string>();
        const minPrice = Infinity;
        const maxPrice = -Infinity;
        const minStock = Infinity;
        const maxStock = -Infinity;

        if (products && Array.isArray(products)) {
          (products as Record<string, unknown>[]).forEach((product) => {
            // Note: Allergens and variants data structure may need adjustment based on actual schema
            if (product && typeof product === 'object' && 'allergens' in product && Array.isArray(product.allergens)) {
              (product.allergens as string[]).forEach((allergen: string) => allAllergens.add(allergen));
            }

            // Process variants
            if (product && typeof product === 'object' && 'variants' in product && Array.isArray(product.variants)) {
              (product.variants as Record<string, unknown>[]).forEach((variant: Record<string, unknown>) => {
                if (variant && typeof variant === 'object' && 'name' in variant && variant.name) {
                  allVariants.add(String(variant.name));
                }
              });
            }
          });
        }

        setOptions({
          allergens: Array.from(allAllergens).sort(),
          variants: Array.from(allVariants).sort(),
          priceRange: {
            min: minPrice === Infinity ? 0 : minPrice,
            max: maxPrice === -Infinity ? 0 : maxPrice
          },
          stockRange: {
            min: minStock === Infinity ? 0 : minStock,
            max: maxStock === -Infinity ? 0 : maxStock
          }
        });
      } catch (err) {
        console.error('Error loading filter options:', err);
        setError(err instanceof Error ? err.message : 'Failed to load filter options');
      } finally {
        setLoading(false);
      }
    }

    loadFilterOptions();
  }, []);

  return { options, loading, error };
}