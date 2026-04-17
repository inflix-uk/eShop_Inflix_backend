// components/ProductDetails.tsx
"use client";
import React, { useState, useEffect, FC, useCallback } from "react";
import { TrashIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { Coupon, ProductItem } from "../../../../../types";
import Image from "next/image";

interface ShippingMethod {
  _id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
  isActive: boolean;
  order: number;
}

interface ProductDetailsProps {
  products: any[];
  removeFromCart: (id: string) => void;
  totalSalePrice: number;
  appliedCoupon: any;
  isChecked: boolean;
  handleTermsCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showWarning: boolean;
  enteredCoupon: string;
  handleCouponInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCouponValid: boolean;
  handleApplyCoupon: (e: React.MouseEvent<HTMLButtonElement>) => void;
  updateCheckoutSession: (coupon?: any) => void;
  couponError?: string;
  onStockDataUpdate?: (
    stockData: Record<string, { availableQuantity: number; inStock: boolean }>
  ) => void;
  // Shipping props
  shippingMethods?: ShippingMethod[];
  selectedShippingMethod?: ShippingMethod | null;
  shippingCost?: number;
  freeShippingThreshold?: number | null;
  freeShippingEnabled?: boolean;
  onShippingMethodChange?: (method: ShippingMethod) => void;
}

const calculateDiscountedPrice = (
  totalSalePrice: number,
  coupon: Coupon | null
): string => {
  let total = totalSalePrice;

  if (coupon) {
    if (coupon.discount_type === "flat") {
      total = total - coupon.discount;
    } else if (coupon.discount_type === "percentage") {
      const discountAmount = (total * coupon.discount) / 100;
      total =
        total -
        (coupon.upto ? Math.min(discountAmount, coupon.upto) : discountAmount);
    }
  }

  return total > 0 ? total.toFixed(2) : "0.00";
};

const ProductDetails: FC<ProductDetailsProps> = ({
  products,
  removeFromCart,
  totalSalePrice,
  appliedCoupon,
  isChecked,
  handleTermsCheckboxChange,
  showWarning,
  enteredCoupon,
  handleCouponInputChange,
  isCouponValid,
  handleApplyCoupon,
  updateCheckoutSession,
  couponError,
  onStockDataUpdate,
  shippingMethods = [],
  selectedShippingMethod,
  shippingCost = 0,
  freeShippingThreshold,
  freeShippingEnabled,
  onShippingMethodChange,
}) => {
  const numericTotalSalePrice = Number(totalSalePrice) || 0;

  const [isCouponApplied, setIsCouponApplied] = useState<boolean>(false);
  const [discountedPrice, setDiscountedPrice] = useState<number>(
    Number(numericTotalSalePrice)
  );
  const [stockData, setStockData] = useState<
    Record<string, { availableQuantity: number; inStock: boolean }>
  >({});

  // Check stock for all products
  const checkAllStock = useCallback(async () => {
    if (products.length === 0) return;

    const stockChecks: Record<
      string,
      { availableQuantity: number; inStock: boolean }
    > = {};

    for (const prod of products) {
      try {
        const response = await fetch("/api/stock/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: prod.productId,
            variantId: prod._id,
          }),
        });

        const data = await response.json();

        if (data.success && data.data) {
          stockChecks[prod._id] = {
            availableQuantity: data.data.availableQuantity,
            inStock: data.data.inStock,
          };
        } else {
          stockChecks[prod._id] = {
            availableQuantity: 0,
            inStock: false,
          };
        }
      } catch (error) {
        console.error(`Error checking stock for ${prod._id}:`, error);
        stockChecks[prod._id] = {
          availableQuantity: 0,
          inStock: false,
        };
      }
    }

    setStockData(stockChecks);

    // Notify parent component about stock data update
    if (onStockDataUpdate) {
      onStockDataUpdate(stockChecks);
    }
  }, [products, onStockDataUpdate]);

  useEffect(() => {
    const storedCoupon = localStorage.getItem("appliedcoupon");
    const coupon: Coupon | null = storedCoupon
      ? JSON.parse(storedCoupon)
      : null;
    if (coupon) {
      setIsCouponApplied(true);
      const newDiscountedPrice = calculateDiscountedPrice(
        numericTotalSalePrice,
        coupon
      );
      setDiscountedPrice(Number(newDiscountedPrice));
    } else {
      setDiscountedPrice(Number(numericTotalSalePrice.toFixed(2)));
    }
  }, [numericTotalSalePrice, appliedCoupon]);

  // Check stock when products change
  useEffect(() => {
    checkAllStock();
  }, [checkAllStock]);

  const handleRemoveCoupon = () => {
    localStorage.removeItem("appliedcoupon");
    setIsCouponApplied(false);
    setDiscountedPrice(Number(numericTotalSalePrice.toFixed(2)));
    updateCheckoutSession();
    window.location.reload();
  };
  return (
    <>
      <ul role="list" className="divide-y divide-gray-200">
        {products.map((product: ProductItem) => {
          const productName = product.name;
          const modifiedProductName = productName.replace(/\s*\([^)]+\)/, ""); // remove everything inside parentheses
          const finalProductName = modifiedProductName.replace(/\s+/g, "-");

          return (
            <li
              key={product._id}
              className="flex sm:flex-nowrap flex-wrap wrap px-4 py-6 sm:px-6"
            >
              <div className="flex-shrink-0">
                <Image
                  src={(() => {
                    // Check variant images first (prefer url for Vercel Blob, fallback to path)
                    if (product.variantImages && product.variantImages.length > 0) {
                      const img = product.variantImages[0] as { path?: string; url?: string };
                      if (img.url) return img.url;
                      if (img.path) return `${process.env.NEXT_PUBLIC_API_URL}/${img.path}`;
                    }
                    // Check gallery images as fallback
                    const productAny = product as any;
                    if (productAny.galleryImages && productAny.galleryImages.length > 0) {
                      const img = productAny.galleryImages[0] as { path?: string; url?: string };
                      if (img.url) return img.url;
                      if (img.path) return `${process.env.NEXT_PUBLIC_API_URL}/${img.path}`;
                    }
                    // Check product thumbnail
                    if (product.productthumbnail) {
                      if (typeof product.productthumbnail === 'string') {
                        return `${process.env.NEXT_PUBLIC_API_URL}/uploads/products/${product.productthumbnail}`;
                      }
                      const thumb = product.productthumbnail as { url?: string; path?: string };
                      if (thumb.url) return thumb.url;
                      if (thumb.path) {
                        return `${process.env.NEXT_PUBLIC_API_URL}/${thumb.path}`;
                      }
                    }
                    // Final fallback
                    return "/placeholder.png";
                  })()}
                  alt={productName}
                  className="w-20 rounded-md"
                  width={224}
                  height={224}
                />
              </div>

              <div className="ml-6 flex flex-1 flex-col">
                <div className="flex">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm">
                      <p className="font-medium text-gray-700 hover:text-gray-800">
                        {`${product.productName} ${finalProductName}`}
                        {product.selectedSim && (
                          <p className="text-sm text-gray-700">
                            (With Free SIM: {product.selectedSim})
                          </p>
                        )}
                      </p>
                    </h4>
                    {/* Display stock information */}
                    {stockData[product._id] && (
                      <div className="mt-1">
                        {stockData[product._id].inStock ? (
                          <p
                            className={`text-xs font-medium ${
                              stockData[product._id].availableQuantity <= 5
                                ? "text-orange-600"
                                : "text-green-600"
                            }`}
                          >
                            {stockData[product._id].availableQuantity <= 5
                              ? "Only "
                              : ""}
                            {stockData[product._id].availableQuantity}{" "}
                            {stockData[product._id].availableQuantity === 1
                              ? "item"
                              : "items"}{" "}
                            available
                          </p>
                        ) : (
                          <p className="text-xs font-medium text-red-600">
                            Out of stock
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flow-root flex-shrink-0">
                    <button
                      type="button"
                      className="-m-2.5 flex items-center justify-center bg-white p-2.5 text-gray-400 hover:text-gray-500"
                      onClick={() => removeFromCart(product._id)}
                    >
                      <TrashIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-2 items-center">
                    <p className="font-medium text-gray-900">
                      £{(product.salePrice * product.qty).toFixed(2)}
                    </p>
                  </div>

                  <div className="ml-4">
                    <label htmlFor="quantity" className="sr-only">
                      Quantity
                    </label>
                    <p className="text-sm">Qty: {product.qty}</p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <dl className="space-y-4 border-t border-gray-200 px-4 py-6 sm:px-6">
        <dt className="text-base font-medium">Shipping Method</dt>
        {shippingMethods.length > 0 ? (
          <div className="space-y-3">
            {/* Free shipping notification */}
            {freeShippingEnabled && freeShippingThreshold != null && (
              <div className={`text-sm p-2 rounded ${
                numericTotalSalePrice >= freeShippingThreshold
                  ? 'bg-green-50 text-green-700'
                  : 'bg-blue-50 text-blue-700'
              }`}>
                {numericTotalSalePrice >= freeShippingThreshold ? (
                  <span>You qualify for free shipping!</span>
                ) : (
                  <span>Add £{(freeShippingThreshold - numericTotalSalePrice).toFixed(2)} more for free shipping</span>
                )}
              </div>
            )}
            {/* Shipping method options */}
            {shippingMethods.map((method, index) => {
              // Free shipping only applies to the cheapest method (first one, order: 0)
              const isCheapestMethod = index === 0 || method.order === 0;
              const qualifiesForFreeShipping = freeShippingEnabled &&
                freeShippingThreshold != null &&
                numericTotalSalePrice >= freeShippingThreshold;
              const isFreeShipping = qualifiesForFreeShipping && isCheapestMethod;
              const displayPrice = isFreeShipping ? 0 : method.price;

              return (
                <label
                  key={method._id}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedShippingMethod?._id === method._id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shippingMethod"
                    value={method._id}
                    checked={selectedShippingMethod?._id === method._id}
                    onChange={() => onShippingMethodChange?.(method)}
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {method.name}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {displayPrice === 0 ? (
                          <span className="text-green-600">FREE</span>
                        ) : (
                          `£${displayPrice.toFixed(2)}`
                        )}
                      </span>
                    </div>
                    {method.estimatedDays && (
                      <p className="text-sm text-gray-500">{method.estimatedDays}</p>
                    )}
                    {method.description && (
                      <p className="text-xs text-gray-400 mt-1">{method.description}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <dd className="text-sm md:text-base font-medium text-gray-500">
              Free Shipping (1-2 Working Days)
            </dd>
          </div>
        )}
      </dl>

      <dl className="space-y-2 border-t border-gray-200 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between border-gray-200">
          <dt className="text-sm text-gray-600">Subtotal</dt>
          <dd className="text-sm text-gray-900">
            £{totalSalePrice}
          </dd>
        </div>

        {shippingCost > 0 && (
          <div className="flex items-center justify-between border-gray-200">
            <dt className="text-sm text-gray-600">Shipping</dt>
            <dd className="text-sm text-gray-900">
              £{shippingCost.toFixed(2)}
            </dd>
          </div>
        )}

        {shippingCost === 0 && selectedShippingMethod && (
          <div className="flex items-center justify-between border-gray-200">
            <dt className="text-sm text-gray-600">Shipping</dt>
            <dd className="text-sm text-green-600 font-medium">
              FREE
            </dd>
          </div>
        )}

        <div className="flex items-center justify-between border-gray-200 pt-2 border-t">
          <dt className="text-base font-medium">Total</dt>
          <dd className="text-base font-medium text-gray-900">
            £{(Number(totalSalePrice) + shippingCost).toFixed(2)}
          </dd>
        </div>

        {isCouponApplied && discountedPrice !== null && (
          <div className="flex items-center justify-between border-gray-200">
            <dt className="text-sm md:text-base font-medium">
              Discounted Price (Coupon: {appliedCoupon?.code})
              {/* Display the trash icon inline with the coupon */}
              <button
                type="button"
                className="ml-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500"
                onClick={handleRemoveCoupon}
              >
                <TrashIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </dt>
            <dd className="text-sm md:text-base font-medium text-green-600">
              £{(discountedPrice + shippingCost).toFixed(2)}
            </dd>
          </div>
        )}

      </dl>

      <dl className="space-y-6 border-t border-gray-200 px-4 py-6 sm:px-6">
        <div className="border-gray-200">
          <div className="flex flex-col gap-1">
            <div className="flex items-center mb-1">
              <input
                id="default-checkbox"
                type="checkbox"
                value=""
                className="w-4 h-4 text-primary bg-gray-50 outline-0 focus:outline-none focus:ring-0 ring-0"
                checked={isChecked}
                onChange={handleTermsCheckboxChange}
              />
              <label
                htmlFor="default-checkbox"
                className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
              >
                <p className="text-black">
                  I have read and accept the{" "}
                  <Link href="/terms-and-conditions">
                    <b className="text-primary hover:underline cursor-pointer">
                      Terms and Conditions
                    </b>
                  </Link>
                </p>
              </label>
            </div>
            {showWarning && (
              <p className="text-red-500 text-sm mb-3">
                Please accept the Terms and Conditions before placing your
                order.
              </p>
            )}
          </div>
        </div>
      </dl>

      <dl className="space-y-6 border-t border-gray-200 px-4 py-6 sm:px-6">
        <div className="border-gray-200">
          <div className="flex flex-col w-full">
            <div className="flex flex-col md:flex-row items-center justify-center space-x-2 gap-2">
              <input
                type="text"
                placeholder="Coupon code"
                value={enteredCoupon}
                onChange={handleCouponInputChange}
                className={`px-2 py-2 border ${
                  couponError ? "border-red-500" : "border-gray-300"
                } rounded focus:border-primary focus:ring-primary w-full`}
                disabled={isCouponApplied} // Disable input if coupon is applied
              />
              <button
                className={`px-2 py-2.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded focus:outline-none w-60
                  ${
                    isCouponApplied
                      ? "bg-gray-200 cursor-not-allowed"
                      : isCouponValid
                      ? "hover:bg-primary hover:text-white focus:bg-primary focus:text-white"
                      : "bg-gray-200 cursor-not-allowed"
                  }`}
                disabled={isCouponApplied || !isCouponValid} // Disable button if coupon is applied or not valid
                onClick={handleApplyCoupon}
              >
                {isCouponApplied ? "Coupon Applied" : "APPLY COUPON"}
              </button>
            </div>
            {couponError && (
              <p className="text-red-500 text-base font-semibold mt-1 ml-1">
                {couponError}
              </p>
            )}
            {isCouponApplied && (
              <p className="text-green-600 text-base font-semibold mt-1 ml-1">
                Coupon applied successfully!
              </p>
            )}
          </div>
        </div>
      </dl>
    </>
  );
};
export default ProductDetails;
