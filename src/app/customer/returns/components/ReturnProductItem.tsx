import type { FC } from 'react';
import Image from 'next/image';
import type { OrderItem } from '../types';
import { getProductImageUrl } from '../utils';

interface ReturnProductItemProps {
  product: OrderItem;
  baseUrl: string;
}

const ReturnProductItem: FC<ReturnProductItemProps> = ({ product, baseUrl }) => {
  const imageUrl = getProductImageUrl(product, baseUrl);
  const mainProductName = product.productName || product.name;

  return (
    <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
      <div className="w-16 h-16 bg-white rounded-md shadow-sm flex-shrink-0 flex items-center justify-center">
        <Image
          src={imageUrl}
          alt={product.metaDescription || mainProductName}
          className="w-full h-full object-contain object-center"
          width={64}
          height={64}
          unoptimized
        />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900 mb-1">{mainProductName}</h3>
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600 flex items-center">
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
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            Qty: {product.qty}
          </p>
          <div className="flex items-center space-x-2">
            {product.Price && product.Price !== product.salePrice && (
              <span className="text-sm text-gray-500 line-through">
                £{(product.Price ?? 0).toFixed(2)}
              </span>
            )}
            <span className="text-sm font-semibold text-green-600">
              £{(product.salePrice ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnProductItem;
