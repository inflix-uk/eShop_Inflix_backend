import type { FC } from 'react';
import type { Order, OrderCalculations } from '../types';

interface OrderHeaderProps {
  order: Order;
  calculations: OrderCalculations;
}

const OrderHeader: FC<OrderHeaderProps> = ({ order, calculations }) => {
  const { datePlaced, timePlaced, totalItems, saleAmount } = calculations;

  return (
    <div className="p-6 border-b border-gray-100">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Order Number */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Order Number</p>
            <p className="text-lg font-semibold text-gray-900">{order.orderNumber}</p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Date & Time</p>
            <p className="text-sm font-semibold text-gray-900">
              {datePlaced} {timePlaced}
            </p>
          </div>
        </div>

        {/* Total Order Value */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Order Value</p>
            <div className="flex items-center space-x-2">
              {order.coupon && order.coupon.length > 0 ? (
                <>
                  <span className="text-sm text-gray-500 line-through">
                    £{(saleAmount || 0).toFixed(2)}
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    £{(order.totalOrderValue || 0).toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-gray-900">
                  £{(saleAmount || 0).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Items Count */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Items</p>
            <p className="text-lg font-semibold text-gray-900">{totalItems}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderHeader;
