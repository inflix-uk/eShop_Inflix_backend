// components/homepage/categories/ProductCard.tsx

import React, { memo } from "react";
import Link from "next/link";
import { StarIcon } from "@heroicons/react/20/solid";
import Image from "next/image";
import { useAuth } from "@/app/context/Auth";
import { Product } from "../../../types";
import { useAppDispatch } from "../lib/hooks";
import { addProduct } from "@/app/lib/features/recentlyviewedproducts/recentlyViewedSlice";
import { hasProductStock } from "../utils/stockUtils";
import { cleanProductSlug } from "@/app/utils/productUrl";

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = memo(({ product }) => {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const minPrice = product.minPrice;
  const minSalePrice = product.minSalePrice;
  const discountPercentage = Math.round(
    ((minPrice - minSalePrice) / minPrice) * 100
  );
  const productNameSlug = cleanProductSlug(product.producturl);
  const averageRating = product.averageRating
    ? Math.round(product.averageRating * 10) / 10
    : 0; // Round to one decimal place or default to 0

  // Check if product has stock (use hasStock field if available, otherwise assume in stock)
  const isInStock = product.hasStock !== undefined ? product.hasStock : true;

  const handleProductClick = () => {
    // Dispatch the product data to Redux
    dispatch(addProduct(product));
  };
  return (
    <div
      className="max-w-screen-xl mx-auto py-5 sm:py-10"
      onClick={handleProductClick}
    >
      <div className="relative bg-white rounded-lg shadow-xl sm:p-5 p-2 md:mb-0 mb-5 transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-card-shadow group cursor-pointer flex flex-col justify-between h-full">
        <div className="mb-2 flex justify-between align-middle">
          <div>
            <span className="bg-gray-200 text-black xs:px-2 px-1 py-1 rounded-lg text-sm text-nowrap">
              {product.condition}
            </span>
          </div>
          <div className="sm:text-sm text-[10px] bg-black px-2 text-white rounded-lg flex flex-col items-center justify-center ms-1 text-nowrap">
            <span>{discountPercentage}% OFF</span>
          </div>
        </div>

        <h3 className="text-lg mb-2 h-16 flex items-start font-normal">
          <Link href={`/products/${productNameSlug}`} className="line-clamp-2 md:line-clamp-2">
            {product.name}
            <span className="absolute inset-0 z-[1]" aria-hidden="true" />
          </Link>
        </h3>

          {/* Fixed box + overflow so layout stays stable when image loads */}
          <div className="relative w-full h-56 min-h-[14rem] shrink-0 overflow-hidden flex items-center justify-center bg-gray-50">
            <Image
              className={`object-contain transform transition-transform duration-1500 ease-in-out scale-105 group-hover:scale-110 ${
                !isInStock ? "opacity-60" : ""
              }`}
              src={product.thumbnail_image?.url || `${auth.ip}${product.thumbnail_image?.path}`}
              alt={product.thumbnail_image?.altText || product.name || "Product Image"}
              title={product.thumbnail_image?.description || undefined}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
            />

            {/* Out of Stock Overlay */}
            {!isInStock && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg transform -rotate-12">
                  <span className="text-lg font-bold">Out of Stock</span>
                </div>
              </div>
            )}
          </div>

          {/* Force bottom section to align consistently */}
          <div className="flex flex-row justify-between items-end md:mt-5 mt-auto w-full">
            <div>
              <small className="text-gray-500 flex gap-1">
                From <del>£{minPrice}</del>
              </small>
              <div className="text-xl sm:text-2xl">£{minSalePrice}</div>
            </div>
            <div className="py-1 text-sm font-regular text-yellow-400 flex flex-row items-center">
              {[0, 1, 2, 3, 4].map((ratingIndex) => {
                const isFullStar = ratingIndex + 1 <= Math.floor(averageRating);
                const isHalfStar = !isFullStar && ratingIndex < averageRating;
                return (
                  <StarIcon
                    key={ratingIndex}
                    className={`h-4 w-4 ${
                      isFullStar
                        ? "text-amber-300"
                        : isHalfStar
                        ? "text-amber-200"
                        : "text-gray-300"
                    }`}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
  );
});
// Add display name for the memoized component
ProductCard.displayName = "ProductCard";

export default ProductCard;
