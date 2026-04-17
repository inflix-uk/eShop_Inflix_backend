import type { FC } from 'react';
import Image from 'next/image';
import type { RequestOrder } from '../../types';

// Get base URL from environment variable with fallback to localhost
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/';

interface ReturnRequestDetailsProps {
  requestOrder: RequestOrder;
}

/**
 * ReturnRequestDetails Component
 * Displays return request information within a message
 */
const ReturnRequestDetails: FC<ReturnRequestDetailsProps> = ({
  requestOrder
}) => {
  if (!requestOrder) return null;

  return (
    <div className="mt-2 p-3 bg-gray-100 rounded-lg shadow-md">
      <h3 className="font-semibold text-gray-800 text-lg mb-2">
        Return Request Details
      </h3>

      <div className="flex flex-wrap justify-between md:mb-4">
        <p className="text-sm text-gray-600 w-full flex flex-col md:w-1/2">
          <strong>Order Number:</strong> {requestOrder?.orderId?.orderNumber}
        </p>
        <p className="text-sm text-gray-600 w-full md:w-1/2 flex flex-col text-left">
          <strong>Status:</strong> {requestOrder?.status}
        </p>
      </div>

      <div className="flex flex-wrap justify-between md:mb-4">
        <p className="text-sm text-gray-600 w-full flex flex-col md:w-1/2">
          <strong>Reason:</strong> {requestOrder?.reason}
        </p>
        <p className="text-sm text-gray-600 w-full md:w-1/2 flex flex-col text-left">
          <strong>Notes:</strong> {requestOrder?.notes}
        </p>
      </div>

      <div className="flex flex-wrap justify-between md:mb-4">
        <p className="text-sm text-gray-600 w-full md:w-1/2 flex flex-col">
          <strong>Total Items:</strong>{' '}
          {requestOrder?.orderId?.cart?.reduce(
            (sum, item) => sum + (item?.qty || 0),
            0
          ) || 0}
        </p>
        <p className="text-sm text-gray-600 w-full md:w-1/2 flex flex-col">
          <strong>Order Total:</strong> £
          {requestOrder?.orderId?.totalOrderValue?.toFixed(2)}
        </p>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        <strong>Placed on:</strong>{' '}
        {new Date(requestOrder.createdAt).toLocaleDateString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })}{' '}
        at{' '}
        {new Date(requestOrder.createdAt).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>

      <h4 className="font-semibold text-gray-800 text-lg mb-2">
        Order Details
      </h4>
      <ul>
        {requestOrder?.orderId?.cart?.map((product) => (
          <li
            key={product._id}
            className="flex flex-col justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
          >
            <div className="flex items-center">
              <Image
                src={`${baseURL}${product?.metaImage?.path}`}
                alt="Product"
                width={50}
                height={50}
                className="object-contain mr-2"
              />
              <span className="text-sm text-gray-600">
                {product.productName || product.name}
              </span>
            </div>
            <span className="text-sm text-gray-600">
              {product.qty} x £{product.salePrice.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReturnRequestDetails;
