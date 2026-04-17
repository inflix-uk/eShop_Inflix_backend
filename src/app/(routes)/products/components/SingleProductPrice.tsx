import React from 'react'

export default function SingleProductPrice({ product }: any) {
  return (
    <>
      {product?.productType?.type === "single" && (
        <div className="flex flex-row items-center gap-1">
          <s>
            <p className="text-sm font-light text-gray-900">
              £
              {product?.variantValues &&
                product?.variantValues?.length > 0 &&
                Number(product?.variantValues[0]?.Price).toLocaleString(
                  "en-GB",
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}{" "}
              new
            </p>
          </s>
          <p className="md:text-xl sm:text-lg text-md font-bold text-gray-900">
            £
            {product?.variantValues &&
              product?.variantValues.length > 0 &&
              Number(product?.variantValues[0]?.salePrice).toLocaleString(
                "en-GB",
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}
          </p>
        </div>
      )}
    </>
  );
}
