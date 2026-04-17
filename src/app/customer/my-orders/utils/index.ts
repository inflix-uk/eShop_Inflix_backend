import type { Order, OrderItem, OrderCalculations, OrderStatus } from '../types';

/**
 * Format date for timeline display
 */
export const formatTimelineDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

/**
 * Format time for timeline display
 */
export const formatTimelineTime = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Date(dateString).toLocaleTimeString(undefined, options);
};

/**
 * Format date in UK format (DD/MM/YYYY)
 */
export const formatDateUK = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Format time in UK format (HH:MM:SS)
 */
export const formatTimeUK = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Calculate order details
 */
export const calculateOrderDetails = (order: Order): OrderCalculations => {
  const regularItems = order.cart;

  const totalItems = regularItems.reduce((sum, item) => sum + item.qty, 0);
  const saleAmount = regularItems.reduce(
    (sum, item) => sum + (item.salePrice || 0) * item.qty,
    0
  );

  const datePlaced = formatDateUK(order.createdAt);
  const timePlaced = formatTimeUK(order.createdAt);

  return {
    regularItems,
    totalItems,
    saleAmount,
    datePlaced,
    timePlaced,
  };
};

/**
 * Get border style based on order status
 */
export const getOrderBorderStyle = (status: OrderStatus | string): string => {
  switch (status) {
    case 'Failed':
      return 'border-l-4 border-b border-red-500 border-t border-r border-red-200';
    case 'Pending':
      return 'border-l-4 border-b border-yellow-500 border-t border-r border-yellow-200';
    case 'Shipped':
    case 'Delivered':
      return 'border-l-4 border-b border-green-500 border-t border-r border-green-200';
    case 'Refunded':
      return 'border-l-4 border-b border-blue-500 border-t border-r border-blue-200';
    case 'Cancelled':
      return 'border-l-4 border-b border-gray-500 border-t border-r border-gray-200';
    default:
      return 'border border-gray-200';
  }
};

/**
 * Get product image URL
 */
export const getProductImageUrl = (item: OrderItem, baseUrl: string): string => {
  if (item.variantImages && item.variantImages.length > 0) {
    return `${baseUrl}${item.variantImages[0].path}`;
  }
  if (item.productthumbnail) {
    return `${baseUrl}${item.productthumbnail.path}`;
  }
  if (item.image) {
    return `${baseUrl}${item.image}`;
  }
  return '';
};

/**
 * Check if return is already initiated or converted
 */
export const isReturnInitiated = (order: Order): boolean => {
  return Boolean(order.returnRequestInitiated || order.returnOrderId);
};

/**
 * Get return status label
 */
export const getReturnStatusLabel = (order: Order): string => {
  if (order.returnOrderId) {
    return 'Return Approved';
  }
  if (order.returnRequestInitiated) {
    return 'Return Requested';
  }
  return '';
};

/**
 * Calculate timeline progress percentage
 */
export const getTimelineProgress = (order: Order): string => {
  if (order.returnOrderId) {
    return '100%';
  }
  if (order.returnRequestInitiated) {
    return '50%';
  }
  return '0%';
};
