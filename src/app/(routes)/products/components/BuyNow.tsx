import Link from "next/link";
import React from "react";

export default function BuyNow({
  deliveryStartStr,
  deliveryEndStr,
  selectedVariant,
  selectedSim,
  setOpenCart,
  addToCart,
  isBuyButtonDisabled,
  updatedPrice,
  product,
  selectedOptions,
  checkingStock,
  stockData,
}: {
  product: any;
  updatedPrice: number;
  isBuyButtonDisabled: boolean;
  addToCart: (variant: any) => void;
  setOpenCart: (open: boolean) => void;
  selectedSim: string;
  selectedVariant: any;
  deliveryStartStr: string;
  deliveryEndStr: string;
  selectedOptions: any;
  checkingStock?: boolean;
  stockData?: {
    availableQuantity: number;
    inStock: boolean;
  } | null;
}) {
  const formatAndCapitalizeWords = (string: string) => {
    return string
      .split(/[-\s]/) // Split the string by hyphen or space
      .map((word) => capitalizeFirstLetter(word)) // Capitalize each word
      .join(" "); // Join them back with spaces instead of hyphen
  };
  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };
  const getSelectedVariantName = () => {
    if (selectedVariant) {
      const storage = selectedOptions?.storage?.toUpperCase() || "";
      const color = formatAndCapitalizeWords(selectedOptions?.color || "");
      const condition = formatAndCapitalizeWords(
        selectedOptions?.condition || ""
      );

      return `${product?.name} ${storage} ${color} ${condition}`.trim();
    }

    return product?.name;
  };
  return (
    <>
      <div className="fixed bottom-0 w-full shadow-2xl p-4 bg-white z-0 border-t border-gray-300">
        <div className="max-w-7xl mx-auto flex lg:flex-row flex-col md:justify-between justify-center items-center">
          {/* Delivery Information */}
          <div className="lg:flex hidden flex-row gap-3 items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg
                width="22"
                height="16"
                viewBox="0 0 22 16"
                fill="none"
                className="w-5"
              >
                <path
                  d="M17 14.5C17.83 14.5 18.5 13.83 18.5 13C18.5 12.17 17.83 11.5 17 11.5C16.17 11.5 15.5 12.17 15.5 13C15.5 13.83 16.17 14.5 17 14.5ZM18.5 5.5H16V8H20.46L18.5 5.5ZM5 14.5C5.83 14.5 6.5 13.83 6.5 13C6.5 12.17 5.83 11.5 5 11.5C4.17 11.5 3.5 12.17 3.5 13C3.5 13.83 4.17 14.5 5 14.5ZM19 4L22 8V13H20C20 14.66 18.66 16 17 16C15.34 16 14 14.66 14 13H8C8 14.66 6.66 16 5 16C3.34 16 2 14.66 2 13H0V2C0 0.89 0.89 0 2 0H16V4H19ZM2 2V11H2.76C3.31 10.39 4.11 10 5 10C5.89 10 6.69 10.39 7.24 11H14V2H2Z"
                  fill="black"
                />
              </svg>
            </div>
            <p className="text-sm font-medium leading-6 text-gray-900">
              Free Delivery by {deliveryStartStr} - {deliveryEndStr}
            </p>
          </div>

          <h2 className="md:text-xl sm:text-lg lg:block hidden text-base font-bold text-gray-900 whitespace-pre-wrap">
            {getSelectedVariantName()}
            {selectedSim && (
              <span className="text-sm font-medium text-gray-700">
                {" "}
                {/* with {selectedSim} SIM */}
              </span>
            )}
          </h2>
          {/* Display price and sale price if product type is single */}
          <div className="flex flex-row gap-3 items-center">
            {/* Price and Reviews */}
            <div className="flex flex-row items-center gap-6">
              <div className="flex flex-col items-end">
                {selectedVariant && selectedVariant.Price != null && !isNaN(Number(selectedVariant.Price)) ? (
                  <>
                    <div className="flex flex-row items-center gap-1">
                      <s>
                        <p className="text-sm font-light text-gray-900">
                          £{parseFloat(selectedVariant.Price).toFixed(2)} new
                        </p>
                      </s>
                      <p className="md:text-xl text-lg font-bold text-gray-900">
                        £{updatedPrice && !isNaN(updatedPrice) ? updatedPrice.toFixed(2) : parseFloat(selectedVariant.salePrice || selectedVariant.Price).toFixed(2)}
                      </p>
                    </div>
                    {/* Stock Information */}
                    {checkingStock ? (
                      <p className="text-xs text-gray-500 mt-1">
                        Checking stock...
                      </p>
                    ) : stockData ? (
                      stockData.inStock ? //   <p className={`text-xs font-semibold ${stockData.availableQuantity <= 5 ? 'text-orange-600' : 'text-green-600'}`}> // <div className="flex flex-col items-end mt-1">
                      //     {stockData.availableQuantity <= 5 ? 'Only ' : ''}{stockData.availableQuantity} {stockData.availableQuantity === 1 ? 'item' : 'items'} remaining
                      //   </p>
                      // </div>
                      null : (
                        <p className="text-xs text-red-600 font-semibold mt-1">
                          Out of stock
                        </p>
                      )
                    ) : selectedVariant.Quantity !== null &&
                      selectedVariant.Quantity !== undefined ? (
                      selectedVariant.Quantity >
                      0 ? //   <p className={`text-xs font-semibold ${selectedVariant.Quantity <= 5 ? 'text-orange-600' : 'text-green-600'}`}> // <div className="flex flex-col items-end mt-1">
                      //     {selectedVariant.Quantity <= 5 ? 'Only ' : ''}{selectedVariant.Quantity} {selectedVariant.Quantity === 1 ? 'item' : 'items'} remaining
                      //   </p>
                      // </div>
                      null : (
                        <p className="text-xs text-red-600 font-semibold mt-1">
                          Out of stock
                        </p>
                      )
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="flex flex-row items-center gap-1">
                      <s>
                        <p className="text-sm font-light text-gray-900">
                          £
                          {product?.variantValues &&
                            product.variantValues.length > 0 &&
                            parseFloat(
                              product?.variantValues[0]?.Price
                            ).toFixed(2)}{" "}
                          new
                        </p>
                      </s>
                      <p className="md:text-xl sm:text-lg text-md font-bold text-gray-900">
                        £
                        {product?.variantValues &&
                          product.variantValues.length > 0 &&
                          parseFloat(
                            product?.variantValues[0]?.salePrice
                          ).toFixed(2)}
                      </p>
                    </div>
                    {/* Stock Information for single products */}
                    {product?.productType?.type === "single" && (
                      <>
                        {checkingStock ? (
                          <p className="text-xs text-gray-500 mt-1">
                            Checking stock...
                          </p>
                        ) : stockData ? (
                          stockData.inStock ? //   <p className={`text-xs font-semibold ${stockData.availableQuantity <= 5 ? 'text-orange-600' : 'text-green-600'}`}> // <div className="flex flex-col items-end mt-1">
                          //     {stockData.availableQuantity <= 5 ? 'Only ' : ''}{stockData.availableQuantity} {stockData.availableQuantity === 1 ? 'item' : 'items'} remaining
                          //   </p>
                          // </div>
                          null : (
                            <p className="text-xs text-red-600 font-semibold mt-1">
                              Out of stock
                            </p>
                          )
                        ) : product?.variantValues?.[0]?.Quantity !== null &&
                          product?.variantValues?.[0]?.Quantity !==
                            undefined ? (
                          product.variantValues[0].Quantity >
                          0 ? //   <p className={`text-xs font-semibold ${product.variantValues[0].Quantity <= 5 ? 'text-orange-600' : 'text-green-600'}`}> // <div className="flex flex-col items-end mt-1">
                          //     {product.variantValues[0].Quantity <= 5 ? 'Only ' : ''}{product.variantValues[0].Quantity} {product.variantValues[0].Quantity === 1 ? 'item' : 'items'} remaining
                          //   </p>
                          // </div>
                          null : (
                            <p className="text-xs text-red-600 font-semibold mt-1">
                              Out of stock
                            </p>
                          )
                        ) : null}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end">
              {isBuyButtonDisabled ? (
                <Link
                  href="/shopall"
                  className="bg-primary text-white py-2 px-4 rounded-md transition-colors duration-200 sm:text-nowrap"
                  onClick={() => {
                    // Scroll to product details or show more info
                    const productDetails = document.querySelector(
                      "[data-product-details]"
                    );
                    if (productDetails) {
                      productDetails.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  View Other Options
                </Link>
              ) : (
                <button
                  className="bg-primary text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    product?.productType?.type !== "single" && !selectedVariant
                  }
                  onClick={() => {
                    setOpenCart(true);
                    // For single products, use the first variantValue; for variant products, use selectedVariant
                    const variantToAdd =
                      product?.productType?.type === "single"
                        ? product?.variantValues?.[0]
                        : selectedVariant;
                    addToCart(variantToAdd);
                  }}
                >
                  Buy Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
