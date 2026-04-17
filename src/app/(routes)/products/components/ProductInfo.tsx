import React from "react";
import SingleProductPrice from "./SingleProductPrice";
import { StarIcon } from "@heroicons/react/24/solid";

export default function ProductInfo({
  product,
  averageRating,
  totalReviews,
  selectedVariant,
  selectedOptions,
}: {
  product: any;
  averageRating: number;
  totalReviews: number;
  selectedVariant: any;
  selectedOptions: any;
}) {
  function classNames(
    ...classes: (string | undefined | null | false)[]
  ): string {
    return classes.filter(Boolean).join(" ");
  }
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
      <div className="flex items-start justify-between">
        <div>
          {" "}
          <h1 className="md:text-2xl sm:text-xl text-lg font-bold text-gray-900">
            {getSelectedVariantName()}
          </h1>
          <SingleProductPrice product={product} />
        </div>
        <div className="flex flex-col mt-1">
          <div className="flex items-center">
            {[0, 1, 2, 3, 4].map((rating) => (
              <StarIcon
                key={rating}
                className={classNames(
                  Math.round(averageRating) > rating
                    ? "text-yellow-400"
                    : "text-gray-300",
                  "h-5 w-5 flex-shrink-0"
                )}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="whitespace-nowrap">
            {averageRating}/5 ({totalReviews} reviews)
          </p>
        </div>
      </div>
    </>
  );
}
