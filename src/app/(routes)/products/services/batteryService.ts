import { ProductData, SelectedVariant } from "../../../../../types";

/**
 * Interface for battery option
 */
export interface BatteryOption {
  name: string;
  value: string;
}

/**
 * Get battery status from product
 * @param product The product data
 * @returns Boolean indicating if battery options are available
 */
export const getBatteryStatus = (product: ProductData | undefined): boolean => {
  if (!product?.battery || !product.battery[0]) return false;
  
  try {
    const batteryJson = JSON.parse(product.battery[0]);
    return batteryJson?.status || false;
  } catch (error) {
    console.error("Error parsing battery status:", error);
    return false;
  }
};

/**
 * Extract battery price from product data
 * @param product The product data
 * @returns Battery price as a number
 */
export const getBatteryPrice = (product: ProductData | undefined): number => {
  if (!product?.battery || !product.battery[0]) return 0;
  
  try {
    const batteryJson = JSON.parse(product.battery[0]);
    return batteryJson?.batteryPrice ? parseFloat(batteryJson.batteryPrice) : 0;
  } catch (error) {
    console.error("Error parsing battery price:", error);
    return 0;
  }
};

/**
 * Get standard battery price from selected variant
 * @param selectedVariant The selected product variant
 * @param product The product data
 * @returns Standard battery price as a string with 2 decimal places
 */
export const getStandardBatteryPrice = (
  selectedVariant: SelectedVariant | null,
  product: ProductData | undefined
): string => {
  if (selectedVariant) {
    return parseFloat(selectedVariant.salePrice).toFixed(2);
  } else if (product?.variantValues && product.variantValues.length > 0) {
    return parseFloat(product.variantValues[0].salePrice).toFixed(2);
  }
  return "0.00";
};

/**
 * Generate battery options for product
 * @param standardBatteryPrice Price of the standard battery
 * @param batteryPrice Price of the new battery
 * @returns Array of battery options
 */
export const generateBatteryOptions = (
  standardBatteryPrice: string,
  batteryPrice: number
): BatteryOption[] => {
  return [
    {
      name: "Standard Battery",
      value: `£${standardBatteryPrice}`,
    },
    {
      name: "New Battery",
      value: `£${batteryPrice.toFixed(2)}`,
    },
  ];
};

/**
 * Calculate updated price based on battery selection
 * @param selectedOption The selected battery option
 * @param standardBatteryPrice Price of the standard battery
 * @param selectedVariant The selected product variant
 * @param batteryPrice Price of the new battery
 * @returns Updated price as a number
 */
export const calculateUpdatedPrice = (
  selectedOption: string,
  standardBatteryPrice: string,
  selectedVariant: SelectedVariant | null,
  batteryPrice: number
): number => {
  if (selectedOption === `£${batteryPrice.toFixed(2)}`) {
    const standardPrice = selectedVariant?.salePrice
      ? parseFloat(selectedVariant.salePrice)
      : 0;
    return standardPrice + parseFloat(batteryPrice.toFixed(2));
  } else if (selectedOption === `£${standardBatteryPrice}`) {
    return parseFloat(standardBatteryPrice);
  }
  return parseFloat(standardBatteryPrice);
};

/**
 * Update product price in cart based on battery selection
 * @param selectedOption The selected battery option
 * @param standardBatteryPrice Price of the standard battery
 * @param selectedVariant The selected product variant
 * @param batteryPrice Price of the new battery
 * @returns Updated price
 */
export const updateProductPriceInCart = (
  selectedOption: string,
  standardBatteryPrice: string,
  selectedVariant: SelectedVariant | null,
  batteryPrice: number
): number => {
  const selectedVariantId = selectedVariant?._id;
  if (!selectedVariantId) return parseFloat(standardBatteryPrice);
  
  const updatedPrice = calculateUpdatedPrice(
    selectedOption,
    standardBatteryPrice,
    selectedVariant,
    batteryPrice
  );
  
  // Update the salePrice of the product in the cart if it exists
  if (typeof window !== 'undefined') {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingProductIndex = cart.findIndex(
      (item: any) => item._id === selectedVariantId
    );
    
    if (existingProductIndex !== -1) {
      cart[existingProductIndex].salePrice = updatedPrice;
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }
  
  return updatedPrice;
};
