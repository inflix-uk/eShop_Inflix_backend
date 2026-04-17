// Enhanced ProductCard with real-time stock checking
import React, { memo } from "react";
import Link from "next/link";
import { StarIcon } from "@heroicons/react/20/solid";
import Image from "next/image";
import { useAuth } from "@/app/context/Auth";
import { Product } from "../../../types";
import { useAppDispatch } from "../lib/hooks";
import { addProduct } from "@/app/lib/features/recentlyviewedproducts/recentlyViewedSlice";
import { useStockStatus } from "../hooks/useStockStatus";
import { cleanProductSlug } from "@/app/utils/productUrl";

interface ProductCardWithStockProps {
  product: Product;
  checkStockRealTime?: boolean; // Optional prop to enable real-time stock checking
}

const ProductCardWithStock: React.FC<ProductCardWithStockProps> = memo(
  ({ product, checkStockRealTime = false }) => {
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
      : 0;

    // Use real-time stock checking if enabled, otherwise use the hasStock field
    const stockStatus = useStockStatus(checkStockRealTime ? product._id : "");
    const isInStock = checkStockRealTime
      ? stockStatus.hasStock
      : product.hasStock !== undefined
      ? product.hasStock
      : true;

    const handleProductClick = () => {
      dispatch(addProduct(product));
    };

    return (
      <div
        className="block h-full min-w-0 w-full max-w-full"
        onClick={handleProductClick}
      >
        <div className="w-full min-w-0 max-w-full py-3 sm:py-5">
          <div className="relative rounded-lg shadow-xl sm:p-5 p-2 md:mb-0 mb-5 transition-all duration-500 ease-in-out hover:scale-100 hover:shadow-card-shadow group cursor-pointer flex flex-col justify-between h-full min-w-0">
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

            <div className="relative w-full h-56 min-h-[14rem] shrink-0 overflow-hidden flex items-center justify-center">
              {product.thumbnail_image?.url || product.thumbnail_image?.path ? (
                <Image
                  className={`object-contain transform transition-transform duration-1500 ease-in-out scale-100 group-hover:scale-105 ${
                    !isInStock ? "opacity-60" : ""
                  }`}
                  src={product.thumbnail_image.url || `${auth.ip}${product.thumbnail_image.path}`}
                  alt={product.thumbnail_image?.altText || product.name || "Product Image"}
                  title={product.thumbnail_image?.description || undefined}
                  fill
                  sizes="(max-width: 50px) 60vw, (max-width: 1024px) 43vw, 25vw"
                  loading="lazy"
                />
              ) : (
                <div className={`w-full h-full bg-gray-100 flex items-center justify-center ${!isInStock ? "opacity-60" : ""}`}>
                  <span className="text-gray-400 text-sm">No image</span>
                </div>
              )}

              {!isInStock && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg transform -rotate-12">
                    <span className="text-lg font-bold">Out of Stock</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-row justify-between items-end md:mt-5 mt-auto w-full">
              <div>
                <small className="text-gray-500 flex gap-1">
                  From <del>£{minPrice}</del>
                </small>
                <div className="text-xl sm:text-2xl">£{minSalePrice}</div>
              </div>
              <div className="py-1 text-sm font-regular text-yellow-400 flex flex-row items-center">
                {[0, 1, 2, 3, 4].map((ratingIndex) => {
                  const isFullStar =
                    ratingIndex + 1 <= Math.floor(averageRating);
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
      </div>
    );
  }
);

ProductCardWithStock.displayName = "ProductCardWithStock";

export default ProductCardWithStock;
