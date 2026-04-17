import React from "react";

const VariantPrice: React.FC<{
  selectedVariant: { Price: number; salePrice: number };
}> = ({ selectedVariant }) => {
  if (!selectedVariant) {
    return null;
  }

  // Extract the price and sale price
  const { Price, salePrice } = selectedVariant;

  // Ensure both prices exist and are valid
  if (!Price || !salePrice) {
    return (
      <div className="text-center text-red-500 py-4">
        Price or Sale Price is missing for this variant
      </div>
    );
  }

  // Calculate the discount percentage
  const discountPercentage = Math.round(((Price - salePrice) / Price) * 100);

  return (
    <div className="sm:text-sm text-[10px] bg-black bg-opacity-80 px-3 py-1 text-white rounded-lg flex flex-col items-center justify-center ms-1 text-nowrap font-bold">
      <span>{discountPercentage}% OFF</span>
    </div>
  );
};
export default VariantPrice;
