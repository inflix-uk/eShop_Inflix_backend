/**
 * Stock API Utility
 * Provides functions to check product stock availability
 */

export interface StockCheckResponse {
  success: boolean;
  data?: {
    availableQuantity: number;
    stockStatus: string;
    inStock: boolean;
    productId: string;
    variantId?: string;
  };
  message?: string;
  error?: string;
}

export interface BatchStockCheckItem {
  productId: string;
  variantId?: string;
  requestedQuantity: number;
}

export interface BatchStockCheckResponse {
  success: boolean;
  data?: {
    items: Array<{
      productId: string;
      variantId?: string;
      availableQuantity: number;
      requestedQuantity: number;
      inStock: boolean;
      sufficient: boolean;
    }>;
    allAvailable: boolean;
    outOfStock: Array<{ productId: string; variantId?: string }>;
    insufficientStock: Array<{
      productId: string;
      variantId?: string;
      available: number;
      requested: number;
    }>;
  };
  message?: string;
  error?: string;
}

/**
 * Check stock availability for a single product/variant
 * @param productId - The product ID
 * @param variantId - Optional variant ID
 * @returns Stock availability information
 */
export const checkStockAvailability = async (
  productId: string,
  variantId?: string
): Promise<StockCheckResponse> => {
  try {
    const response = await fetch('/api/stock/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId, variantId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking stock availability:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check stock',
    };
  }
};

/**
 * Check stock availability for multiple products/variants (batch check)
 * @param items - Array of items to check
 * @returns Batch stock availability information
 */
export const checkBatchStockAvailability = async (
  items: BatchStockCheckItem[]
): Promise<BatchStockCheckResponse> => {
  try {
    const response = await fetch('/api/stock/check-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking batch stock availability:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check batch stock',
    };
  }
};
