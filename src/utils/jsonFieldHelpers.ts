/**
 * Helper functions for handling JSON fields in the database
 * Used for ingredient_list and allergen_info which are now JSONB type
 */

export interface IngredientListJson {
  ingredients: string[];
  updated_at: string;
}

export interface AllergenInfoJson {
  allergens: string[];
  contains_allergens: boolean;
  updated_at: string;
}

/**
 * Convert ingredient string to JSON format for database
 */
export function ingredientStringToJson(ingredientString: string): IngredientListJson | null {
  if (!ingredientString || ingredientString.trim() === '') {
    return null;
  }
  
  const ingredients = ingredientString
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  return {
    ingredients,
    updated_at: new Date().toISOString()
  };
}

/**
 * Convert JSON format from database to display string
 */
export function ingredientJsonToString(json: unknown): string {
  if (!json) return '';
  
  try {
    const data = json as IngredientListJson;
    if (data.ingredients && Array.isArray(data.ingredients)) {
      return data.ingredients.join(', ');
    }
  } catch (e) {
    console.error('Error parsing ingredient JSON:', e);
  }
  
  return '';
}

/**
 * Convert allergen string to JSON format for database
 */
export function allergenStringToJson(allergenString: string): AllergenInfoJson | null {
  if (!allergenString || allergenString.trim() === '') {
    return null;
  }
  
  if (allergenString.toUpperCase() === 'NA' || allergenString.trim() === '') {
    return {
      allergens: [],
      contains_allergens: false,
      updated_at: new Date().toISOString()
    };
  }
  
  const allergens = allergenString
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  return {
    allergens,
    contains_allergens: allergens.length > 0,
    updated_at: new Date().toISOString()
  };
}

/**
 * Convert JSON format from database to display string
 */
export function allergenJsonToString(json: unknown): string {
  if (!json) return 'NA';
  
  try {
    const data = json as AllergenInfoJson;
    if (!data.contains_allergens || !data.allergens || data.allergens.length === 0) {
      return 'NA';
    }
    return data.allergens.join(', ');
  } catch (e) {
    console.error('Error parsing allergen JSON:', e);
  }
  
  return 'NA';
}

/**
 * Check if ingredient list is valid (for P0 compliance)
 */
export function isIngredientListValid(value: string | IngredientListJson | null | undefined): boolean {
  if (!value) return false;
  
  if (typeof value === 'string') {
    return value.trim().length >= 10;
  }
  
  try {
    const data = value as IngredientListJson;
    if (data.ingredients && Array.isArray(data.ingredients)) {
      const fullString = data.ingredients.join(', ');
      return fullString.length >= 10;
    }
  } catch (e) {
    return false;
  }
  
  return false;
}

/**
 * Check if allergen info is valid (for P0 compliance)
 */
export function isAllergenInfoValid(value: string | AllergenInfoJson | null | undefined): boolean {
  if (!value) return false;
  
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  
  try {
    const data = value as AllergenInfoJson;
    return data.allergens !== undefined && data.contains_allergens !== undefined;
  } catch (e) {
    return false;
  }
  
  return true;
}
