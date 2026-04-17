import type { FC } from 'react';
import Image from 'next/image';
import type { UserOrder } from '../../types';

interface OrderSelectionPanelProps {
  orders: UserOrder[];
  isLoading: boolean;
  onSelectOrder: (order: UserOrder) => void;
  onStartGeneralChat: () => void;
}

/**
 * OrderSelectionPanel Component
 * Displays user's previous orders and allows them to start a chat
 * either against a specific order or as a general chat
 */
const OrderSelectionPanel: FC<OrderSelectionPanelProps> = ({
  orders,
  isLoading,
  onSelectOrder,
  onStartGeneralChat
}) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-green-100 text-green-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
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

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Start a New Chat</h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Choose an order to discuss or start a general conversation
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
        {/* General Chat Option */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={onStartGeneralChat}
            disabled={isLoading}
            className={`w-full bg-white border-2 border-dashed rounded-xl p-4 sm:p-6 transition-all duration-200 group touch-manipulation ${
              isLoading
                ? 'border-gray-200 cursor-not-allowed opacity-60'
                : 'border-green-300 hover:border-green-500 hover:bg-green-50 active:bg-green-100'
            }`}
          >
            <div className="flex items-center justify-center">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mr-3 sm:mr-4 transition-colors ${
                isLoading ? 'bg-gray-100' : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                ) : (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                )}
              </div>
              <div className="text-left">
                <h3 className={`text-base sm:text-lg font-semibold ${
                  isLoading ? 'text-gray-400' : 'text-gray-900 group-hover:text-green-700'
                }`}>
                  {isLoading ? 'Loading orders...' : 'Start General Chat'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  {isLoading ? 'Please wait while we fetch your orders' : 'Ask questions not related to any specific order'}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center mb-4 sm:mb-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-3 sm:px-4 text-xs sm:text-sm text-gray-500 font-medium">OR SELECT AN ORDER</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-sm text-gray-500">
              You don&apos;t have any orders yet. Start a general chat instead.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Your previous orders ({orders.length})
            </p>
            {orders.map((order) => {
              const thumbUrl = getProductImage(order);
              return (
              <button
                key={order._id}
                onClick={() => onSelectOrder(order)}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 sm:p-4 hover:border-green-500 hover:shadow-md active:bg-gray-50 transition-all duration-200 text-left group touch-manipulation"
              >
                <div className="flex items-start">
                  {/* Order Image */}
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 mr-3 sm:mr-4">
                    {thumbUrl ? (
                      <Image
                        src={thumbUrl}
                        alt="Product"
                        fill
                        className="object-cover"
                        sizes="(min-width: 640px) 64px, 56px"
                        unoptimized={
                          thumbUrl.startsWith('http://localhost') ||
                          thumbUrl.startsWith('http://127.0.0.1')
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Order Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-green-700 truncate">
                        Order #{order.orderNumber}
                      </h4>
                      <span className={`px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mb-1.5 sm:mb-2">
                      {formatDate(order.createdAt)}
                    </p>

                    {/* Products preview */}
                    <div className="text-xs text-gray-600 mb-2">
                      {order.cart?.slice(0, 2).map((item, index) => (
                        <span key={item._id}>
                          {item.productName || item.name}
                          {index < Math.min(order.cart.length - 1, 1) ? ', ' : ''}
                        </span>
                      ))}
                      {order.cart?.length > 2 && (
                        <span className="text-gray-400"> +{order.cart.length - 2} more</span>
                      )}
                    </div>

                    {/* Order Total */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        Total: £{order.totalOrderValue?.toFixed(2)}
                      </span>
                      <span className="text-xs text-green-600 font-medium group-hover:text-green-700">
                        Chat about this order →
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderSelectionPanel;
