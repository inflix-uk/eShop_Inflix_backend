import type { FC } from 'react';
import Image from 'next/image';
import type { OrderItem } from '../types';
import { getProductImageUrl } from '../utils';

interface ProductItemProps {
  item: OrderItem;
  baseUrl: string;
}

const ProductItem: FC<ProductItemProps> = ({ item, baseUrl }) => {
  const imageUrl = getProductImageUrl(item, baseUrl);
  const mainProductName = item.productName || item.name;

  return (
    <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0">
        <div className="w-20 h-20 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.metaDescription || mainProductName}
              className="w-full h-full object-cover"
              width={80}
              height={80}
              unoptimized
            />
          ) : (
            <svg
              className="w-10 h-10 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 truncate">
          {mainProductName}
        </h3>
        {item.name && item.name !== mainProductName && (
          <p className="text-xs text-gray-500 mt-0.5">{item.name}</p>
        )}
        <div className="mt-2 space-y-1">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Quantity:</span> {item.qty}
          </p>
          <div className="flex items-center space-x-2">
            {item.Price && item.Price !== item.salePrice && (
              <span className="text-sm text-gray-500 line-through">
                £{(item.Price || 0).toFixed(2)}
              </span>
            )}
            <span className="text-sm font-semibold text-gray-900">
              £{(item.salePrice || 0).toFixed(2)}
            </span>
          </div>
          {item.SKU && (
            <p className="text-xs text-gray-500">
              <span className="font-medium">SKU:</span> {item.SKU}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductItem;
