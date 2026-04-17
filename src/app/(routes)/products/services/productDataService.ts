import { ProductData, ThumbnailImage } from "../../../../../types";

/**
 * Calculate delivery dates based on the current time
 * @returns Object containing formatted delivery dates
 */
export const calculateDeliveryDates = (): {
  deliveryStartStr: string;
  deliveryEndStr: string;
} => {
  const today = new Date();
  // Get the current time
  const currentHour = today.getHours();
  // Calculate delivery dates based on the current time
  const deliveryStart = new Date(today);
  const deliveryEnd = new Date(today);
  
  if (currentHour < 16) {
    // Before 4 PM
    deliveryStart.setDate(today.getDate() + 1);
    deliveryEnd.setDate(today.getDate() + 4);
  } else {
    // After 4 PM
    deliveryStart.setDate(today.getDate() + 2);
    deliveryEnd.setDate(today.getDate() + 5);
  }
  
  // Format dates to a readable string
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  
  const deliveryStartStr = deliveryStart.toLocaleDateString("en-GB", options);
  const deliveryEndStr = deliveryEnd.toLocaleDateString("en-GB", options);
  
  return { deliveryStartStr, deliveryEndStr };
};

/**
 * Get product images based on variant selection
 * @param product - The product data
 * @param selectedVariant - The selected variant
 * @returns Array of image URLs
 */
export const getProductImages = (
  product: ProductData | undefined,
  selectedVariant: any
): ThumbnailImage[] => {
  if (!product) return [];
  
  if (product?.productType?.type === "single") {
    return product?.Gallery_Images || []; // Default to an empty array
  } else {
    // For variant products, show variant images if selected, otherwise show default product images
    return (selectedVariant?.variantImages && selectedVariant.variantImages.length > 0) 
      ? selectedVariant.variantImages 
      : product?.Gallery_Images || [];
  }
};

/**
 * Create breadcrumb trail for product page
 * @param product - The product data
 * @param productName - The product name/slug
 * @returns Array of breadcrumb items
 */
export const createBreadcrumb = (
  product: ProductData | undefined,
  productName: string | string[]
): { name: string; link: string; current: boolean }[] => {
  if (!product || !productName) return [];
  
  return [
    { name: product?.name || "", link: `/products/${productName}`, current: true },
  ];
};

/**
 * Get or extract initial product variant from URL
 * This would be a placeholder for the more complex URL parsing logic
 * in the original component
 */
export const getInitialVariantFromUrl = (product: ProductData): any => {
  console.log("getInitialVariantFromUrl product", product);
  // This would need the complex logic extracted from the component
  // Since this involves URL parsing, DOM manipulation and many dependencies,
  // it's a good candidate for refactoring but would need a more complex approach
  return null;
};

/**
 * Calculate average rating from product reviews
 * @param product - The product data
 * @returns The average rating value
 */
export const calculateAverageRating = (product: ProductData): number => {
  console.log("calculateAverageRating product", product);
  // This would be implemented based on the review calculation logic
  // Not fully visible in the provided code snippet
  return 0;
};
