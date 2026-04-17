import type { RequestOrder, ReturnSummary, ReturnStatus, OrderItem } from '../types';

/**
 * Status color mapping
 */
export const STATUS_COLORS: Record<ReturnStatus | string, string> = {
  Pending: 'bg-yellow-600 text-white',
  Accepted: 'bg-green-600 text-white',
  Rejected: 'bg-red-600 text-white',
};

/**
 * Filter options for returns
 */
export const FILTER_OPTIONS = ['All', 'Accepted', 'Pending', 'Rejected'] as const;

/**
 * Format date in UK format
 */
export const formatDateUK = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Format time in UK format
 */
export const formatTimeUK = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format date for timeline (short format)
 */
export const formatTimelineDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format time for timeline
 */
export const formatTimelineTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format short date (day + month)
 */
export const formatShortDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
};

/**
 * Calculate return summary from orders
 */
export const calculateSummary = (orders: RequestOrder[]): ReturnSummary => {
  return orders.reduce(
    (acc, order) => {
      acc.total += 1;
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    },
    { total: 0 } as ReturnSummary
  );
};

/**
 * Calculate total items in order
 */
export const calculateTotalItems = (cart: OrderItem[] | undefined): number => {
  if (!cart) return 0;
  return cart.reduce((sum, item) => sum + (item?.qty || 0), 0);
};

/**
 * Get product image URL
 */
export const getProductImageUrl = (product: OrderItem, baseUrl: string): string => {
  if (product.variantImages && product.variantImages.length > 0) {
    return `${baseUrl}${product.variantImages[0].path}`;
  }
  if (product.productthumbnail) {
    return `${baseUrl}${product.productthumbnail.path}`;
  }
  return '/placeholder.png';
};

/**
 * Get timeline progress width based on status
 */
export const getTimelineProgress = (order: RequestOrder): string => {
  if (order.status === 'Accepted' || order.converted) {
    return '100%';
  }
  if (order.status === 'Pending' || order.status === 'Rejected') {
    return '50%';
  }
  return '0%';
};

/**
 * Filter orders by status
 */
export const filterOrdersByStatus = (
  orders: RequestOrder[],
  status: string
): RequestOrder[] => {
  if (status === 'All') {
    return orders;
  }
  return orders.filter((order) => order.status === status);
};
