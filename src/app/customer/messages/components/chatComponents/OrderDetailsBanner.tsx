import type { FC } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import type { UserOrder } from '../../types';

interface OrderDetailsBannerProps {
  order: UserOrder;
  onBackClick?: () => void;
}

/**
 * OrderDetailsBanner Component
 * Displays order details at the top of the chat window
 */
const OrderDetailsBanner: FC<OrderDetailsBannerProps> = ({ order, onBackClick }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'shipped':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'refunded':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProductImage = (order: UserOrder) => {
    const firstItem = order.cart?.[0];
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';

    if (firstItem?.productthumbnail?.path) {
      const path = firstItem.productthumbnail.path.startsWith('/')
        ? firstItem.productthumbnail.path
        : `/${firstItem.productthumbnail.path}`;
      return `${baseUrl}${path}`;
    }
    if (firstItem?.variantImages?.[0]?.path) {
      const path = firstItem.variantImages[0].path.startsWith('/')
        ? firstItem.variantImages[0].path
        : `/${firstItem.variantImages[0].path}`;
      return `${baseUrl}${path}`;
    }
    return null;
  };

  const totalItems = order.cart?.reduce((sum, item) => sum + (item.qty || 1), 0) || 0;

  return (
    <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="flex items-start gap-2 sm:gap-4">
        {onBackClick && (
          <button
            onClick={onBackClick}
            className="sm:hidden p-1.5 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0 mt-1"
            aria-label="Back to conversations"
          >
            <FiArrowLeft size={18} className="text-gray-700" />
          </button>
        )}
        {/* Product Image */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
          {getProductImage(order) ? (
            <img
              src={getProductImage(order) as string}
              alt="Product"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
        </div>

        {/* Order Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900">
              Order #{order.orderNumber}
            </h3>
            <span className={`px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full border flex-shrink-0 ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>

          {/* Products List */}
          <div className="text-xs text-gray-600 mb-1">
            {order.cart?.slice(0, 2).map((item, index) => (
              <span key={item._id}>
                {item.productName || item.name}
                {item.qty > 1 && ` (x${item.qty})`}
                {index < Math.min(order.cart.length - 1, 1) ? ', ' : ''}
              </span>
            ))}
            {order.cart?.length > 2 && (
              <span className="text-gray-400"> +{order.cart.length - 2} more</span>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">{formatDate(order.createdAt)}</span>
              <span className="sm:hidden">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </span>
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              £{order.totalOrderValue?.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsBanner;
