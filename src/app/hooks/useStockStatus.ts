import { useState, useEffect } from 'react';

interface StockStatus {
  hasStock: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook to check stock status for a product
 * @param productId - The product ID to check
 * @returns Stock status information
 */
export const useStockStatus = (productId: string): StockStatus => {
  const [stockStatus, setStockStatus] = useState<StockStatus>({
    hasStock: true, // Default to in stock
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!productId) return;

    const checkStockStatus = async () => {
      setStockStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const response = await fetch(`/api/products/stock/${productId}`);
        const data = await response.json();
        
        if (response.ok) {
          setStockStatus({
            hasStock: data.hasStock,
            isLoading: false,
            error: null,
          });
        } else {
          setStockStatus({
            hasStock: true, // Default to in stock on error
            isLoading: false,
            error: data.message || 'Failed to check stock status',
          });
        }
      } catch (error) {
        setStockStatus({
          hasStock: true, // Default to in stock on error
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    checkStockStatus();
  }, [productId]);

  return stockStatus;
};
