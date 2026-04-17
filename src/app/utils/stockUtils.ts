/**
 * Utility functions for checking product stock status
 */

/**
 * Checks if a product has any available variants in stock
 * @param product - Product data with variant information
 * @returns boolean indicating if product has stock
 */
export const hasProductStock = (product: any): boolean => {
  // If product has variantValues, check if any variant has stock
  if (product.variantValues && Array.isArray(product.variantValues)) {
    return product.variantValues.some((variant: any) => 
      variant.Quantity && variant.Quantity > 0
    );
  }
  
  // If no variant data available, assume in stock (fallback)
  return true;
};

/**
 * Checks if a specific variant is sold out
 * @param variant - Variant with Quantity field
 * @returns boolean indicating if variant is sold out
 */
export const isVariantSoldOut = (variant: { Quantity: number | null }): boolean => {
  return !variant || variant.Quantity === null || variant.Quantity === 0;
};
