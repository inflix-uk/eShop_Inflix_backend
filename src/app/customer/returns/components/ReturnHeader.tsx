import type { FC } from 'react';
import type { RequestOrder } from '../types';
import { STATUS_COLORS, formatDateUK, formatTimeUK, calculateTotalItems } from '../utils';

interface ReturnHeaderProps {
  order: RequestOrder;
}

const ReturnHeader: FC<ReturnHeaderProps> = ({ order }) => {
  const totalItems = calculateTotalItems(order?.orderId?.cart);
  const datePlaced = formatDateUK(order.createdAt);
  const timePlaced = formatTimeUK(order.createdAt);

  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Return Icon */}
            <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </div>

            {/* Return Number */}
            <span className="text-lg font-semibold text-gray-900">
              Return #{order?.requestOrderNumber}
            </span>

            {/* Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                STATUS_COLORS[order.status] || 'bg-gray-200 text-gray-800'
              }`}
            >
              {order.status === 'Accepted' && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span>{order.status}</span>
            </span>
          </div>

          {/* Order Reference & Date */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              Order #{order?.orderId?.orderNumber}
            </span>
            <span>•</span>
            <span>
              Placed on {datePlaced} at {timePlaced}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex space-x-6 mt-4 lg:mt-0">
          {/* Total Items */}
          <div className="text-right">
            <p className="text-sm text-gray-600 flex items-center justify-end mb-1">
              <svg
                className="w-4 h-4 mr-1 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Total Items
            </p>
            <p className="text-lg font-semibold text-gray-900">{totalItems}</p>
          </div>

          {/* Order Total */}
          <div className="text-right">
            <p className="text-sm text-gray-600 flex items-center justify-end mb-1">
              <svg
                className="w-4 h-4 mr-1 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
              Order Total
            </p>
            <p className="text-lg font-semibold text-green-600">
              £{(order?.orderId?.totalOrderValue ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnHeader;
