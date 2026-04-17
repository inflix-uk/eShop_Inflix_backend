import React, { useState } from "react";
import { ConditionPrices } from "../../../../../types";
import { RadioGroup, Radio } from "@headlessui/react";
import { readableToSlug } from "../utils/variantUtils";
import Select, { components, OptionProps, SingleValueProps } from "react-select";
import Image from "next/image";
// const RadioGroup = dynamic(
//   () => import("@headlessui/react").then((mod) => mod.RadioGroup),
//   {
//     ssr: false,
//   }
// );
// const RadioGroupOption = dynamic(
//   () => import("@headlessui/react").then((mod) => mod.RadioGroup.Option),
//   {
//     ssr: false,
//   }
// );
export default function VariantFields({
  product,
  setOpenConditionDescription,
  setVariantDesc,
  setActiveTab,
  selectedOptions,
  handleOptionChange,
  processOptionValue,
  checkIfSoldOut,
  conditionPrices,
}: {
  product: any;
  setOpenConditionDescription: (value: boolean) => void;
  setVariantDesc: (value: Record<string, any>) => void;
  setActiveTab: (value: string) => void;
  selectedOptions: { [key: string]: string };
  handleOptionChange: (variantName: string, selectedOption: any) => void;
  processOptionValue: (variantName: string, optionValue: string | { value?: string; slug?: string; name?: string }) => string;
  checkIfSoldOut: (variantCombination: any) => boolean;
  conditionPrices: ConditionPrices[];
}) {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  function classNames(
    ...classes: (string | undefined | null | false)[]
  ): string {
    return classes.filter(Boolean).join(" ");
  }

  // Format variant name for display (e.g., "collar_type" -> "Collar Type")
  const formatVariantName = (name: string): string => {
    if (!name) return "";
    return name
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Function to get image URL for a variant option (used in dropdown)
  const getImageForOption = (optionSlug: string): string | null => {
    // Normalize the option slug for matching
    const normalize = (str: string) => str?.toLowerCase()?.replace(/[\s-]+/g, '_')?.trim() || '';
    const normalizedOption = normalize(optionSlug);

    // Check varImgGroup for matching images
    if (product?.varImgGroup && Array.isArray(product.varImgGroup)) {
      const imgGroup = product.varImgGroup.find(
        (group: any) => normalize(group.name || '') === normalizedOption
      );
      if (imgGroup?.varImg && imgGroup.varImg.length > 0) {
        const img = imgGroup.varImg[0];
        // Prefer url (Vercel Blob) over path
        if (img.url) return img.url;
        if (img.path) return `${process.env.NEXT_PUBLIC_API_URL}/${img.path}`;
      }
    }

    // Fallback: Check Gallery_Images
    if (product?.Gallery_Images && product.Gallery_Images.length > 0) {
      const img = product.Gallery_Images[0];
      if (img.url) return img.url;
      if (img.path) return `${process.env.NEXT_PUBLIC_API_URL}/${img.path}`;
    }

    return null;
  };

  // Function to get preview image for a color variant
  const getPreviewImageForColor = (colorName: string) => {
    // Normalize function for matching
    const normalize = (str: string) => str?.toLowerCase()?.replace(/_/g, ' ')?.replace(/-/g, ' ')?.trim() || '';

    // Get current selections (case-insensitive)
    const currentStorage = selectedOptions["storage"] || selectedOptions["Storage"] || "";
    const currentCondition = selectedOptions["condition"] || selectedOptions["Condition"] || "";

    const matchedVariant = product.variantValues.find(
      (v: { name: string; variantImages?: any[] }) => {
        const normalizedVariantName = normalize(v.name);
        const normalizedColor = normalize(colorName);
        const normalizedStorage = normalize(currentStorage);
        const normalizedCondition = normalize(currentCondition);

        // Check if all parts exist in the variant name
        return normalizedVariantName.includes(normalizedColor) &&
          normalizedVariantName.includes(normalizedStorage) &&
          normalizedVariantName.includes(normalizedCondition);
      }
    );

    if (
      matchedVariant &&
      matchedVariant.variantImages &&
      matchedVariant.variantImages.length > 0
    ) {
      // Prefer url (Vercel Blob) over path
      return matchedVariant.variantImages[0].url || matchedVariant.variantImages[0].path;
    }
    return null;
  };

  // Generate product URL for any variant option
  const generateVariantUrl = (variantType: string, optionValue: string) => {
    // Create a temporary selection with this option value
    const tempOptions = { ...selectedOptions, [variantType]: optionValue };

    // DYNAMIC: Get existing variants in their original order from product
    const orderedExistingVariants = product?.variantNames?.map((v: any) =>
      v?.name?.trim().toLowerCase()
    ) || [];

    // Build selections object for existing variants only
    const selections: { [key: string]: string } = {};
    for (const variantName of orderedExistingVariants) {
      selections[variantName] = tempOptions[variantName] || "";
    }

    // Check if ALL existing variants are selected
    const hasAllRequiredVariants = orderedExistingVariants.every(
      (variantName: string) => selections[variantName] && selections[variantName].trim() !== ""
    );

    if (!hasAllRequiredVariants) {
      // Not all variants selected, use base URL
      const baseSlug = product.producturl?.replace(/-\d{13}$/, "") ?? "";
      return `/products/${baseSlug}`;
    }

    const toUrlSlug = (value: string): string => {
      if (!value) return "";
      if (value.includes("_") && !value.includes(" ")) {
        return value.toLowerCase();
      }
      return readableToSlug(value);
    };

    const variantSlug = orderedExistingVariants
      .map((variantName: string) => selections[variantName])
      .filter(Boolean)
      .map(toUrlSlug)
      .join("-");

    const baseSlug = product.producturl?.replace(/-\d{13}$/, "") ?? "";
    return `/products/${baseSlug}/${variantSlug}`;
  };
  // Get the ordered list of variant names that exist in this product
  // DYNAMIC: Uses actual variant names from product in their original order
  const getExistingVariantOrder = () => {
    return product?.variantNames?.map((v: any) =>
      v?.name?.trim().toLowerCase()
    ) || [];
  };

  // Function to check if a variant should be disabled based on current selections
  const isVariantDisabled = (variantName: string) => {
    const variantNameLower = variantName.toLowerCase();
    const existingVariantOrder = getExistingVariantOrder();

    // Find the index of this variant in the order
    const variantIndex = existingVariantOrder.indexOf(variantNameLower);

    // If variant is not in the order or is the first one, it's always enabled
    if (variantIndex <= 0) {
      return false;
    }

    // Check if all previous variants in the order are selected
    for (let i = 0; i < variantIndex; i++) {
      const previousVariant = existingVariantOrder[i];
      if (!selectedOptions[previousVariant] || selectedOptions[previousVariant].trim() === "") {
        return true;
      }
    }

    return false;
  };

  // Function to get the message for disabled variants
  const getDisabledMessage = (variantName: string) => {
    const variantNameLower = variantName.toLowerCase();
    const existingVariantOrder = getExistingVariantOrder();
    const variantIndex = existingVariantOrder.indexOf(variantNameLower);

    if (variantIndex <= 0) {
      return "";
    }

    // Get the list of previous variants that need to be selected
    const previousVariants = existingVariantOrder.slice(0, variantIndex);

    // Format variant names for display
    const formattedVariants = previousVariants.map(formatVariantName);

    // Format the message
    if (formattedVariants.length === 1) {
      return `Select ${formattedVariants[0]} first`;
    } else {
      return `Select ${formattedVariants.join(" and ")} first`;
    }
  };

  // Function to get available options for a variant based on current selections
  const getAvailableOptionsForVariant = (variant: any) => {
    const variantName = variant?.name?.trim().toLowerCase();

    if (variantName === "condition") {
      // All condition options are always available
      return variant.options;
    }

    if (variantName === "storage") {
      // Show all storage options, but they'll be disabled if no condition is selected
      return variant.options;
    }

    if (variantName === "color") {
      // Show all color options, but they'll be disabled if condition and storage aren't selected
      return variant.options;
    }

    // For other variants, return all options
    return variant.options;
  };

  // DYNAMIC: Use variant names in their original order from product
  // No hardcoded sorting - respects the order defined in product.variantNames
  const reorderedVariants = product?.variantNames;

  // Number of options to show as buttons before switching to dropdown
  const BUTTON_LIMIT = 4;

  const variantFields = reorderedVariants?.map((variant: any) => {
    const variantName = variant?.name?.trim();
    const availableOptions = getAvailableOptionsForVariant(variant);
    const hasMoreOptions = availableOptions.length > BUTTON_LIMIT;

    // Split options: first 4 as buttons, rest in dropdown
    const buttonOptions = availableOptions.slice(0, BUTTON_LIMIT);
    const dropdownOptions = hasMoreOptions ? availableOptions.slice(BUTTON_LIMIT) : [];

    // Check if currently selected option is in the dropdown
    const currentSelection = selectedOptions[variantName] ?? "";
    const isSelectionInDropdown = dropdownOptions.some((opt: any) => {
      const optName = processOptionValue(variantName, opt);
      return optName === currentSelection;
    });

    return (
      <fieldset key={variant?.name?.trim()}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <legend className="text-sm font-semibold leading-6 text-gray-900">
              {variantName.toLowerCase() === "color"
                ? "Select Color"
                : variantName.toLowerCase() === "storage"
                ? "Select Storage"
                : variantName.toLowerCase() === "condition"
                ? "Select Condition"
                : `Select ${formatVariantName(variantName)}`}
            </legend>
            {isVariantDisabled(variantName) && (
              <span className="text-xs text-gray-500 mt-1">
                {getDisabledMessage(variantName)}
              </span>
            )}
          </div>
          {(() => {
            // Case-insensitive key matching for variantDescription
            const variantDescObj = product?.variantDescription?.[0];
            const variantKey = variantName.toLowerCase();
            const matchedKey = variantDescObj ? Object.keys(variantDescObj).find(
              (key) => key.toLowerCase() === variantKey
            ) : null;
            const descriptionData = matchedKey ? variantDescObj[matchedKey] : null;

            // Get the currently selected option for this variant
            const selectedOption = selectedOptions[variantName] || selectedOptions[variantName.toLowerCase()];

            // Helper to check if a value has valid content
            const hasContent = (value: any) => {
              if (Array.isArray(value)) {
                return value.some((v) => v && v.trim() !== "");
              }
              return value && value !== "";
            };

            // Find the description for the selected option (case-insensitive match)
            // Prioritize keys that have actual content
            const getSelectedOptionDescription = () => {
              if (!descriptionData || !selectedOption) return null;
              const normalizedSelected = selectedOption.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');

              // Find all matching keys
              const matchingKeys = Object.keys(descriptionData).filter(
                (key) => key.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_') === normalizedSelected
              );

              // First try to find a key with valid content
              const keyWithContent = matchingKeys.find((key) => hasContent(descriptionData[key]));
              if (keyWithContent) {
                return { key: keyWithContent, value: descriptionData[keyWithContent] };
              }

              // Fall back to first match if no content found
              if (matchingKeys.length > 0) {
                return { key: matchingKeys[0], value: descriptionData[matchingKeys[0]] };
              }

              return null;
            };

            const selectedDesc = getSelectedOptionDescription();

            // Check if the selected option has a valid description
            const hasValidDescription = selectedDesc && hasContent(selectedDesc.value);

            return hasValidDescription ? (
              <button
                onClick={() => {
                  setOpenConditionDescription(true);
                  setVariantDesc({ [selectedDesc.key]: selectedDesc.value });
                  setActiveTab(selectedDesc.key);
                }}
                type="button"
                className="text-sm font-medium text-primary hover:text-green-500 hover:underline"
              >
                See Guide
              </button>
            ) : null;
          })()}
        </div>

        {/* Radio buttons for first 4 options */}
        <RadioGroup
          value={selectedOptions[variantName] ?? ""}
          onChange={(selectedOption) => {
            handleOptionChange(variantName, selectedOption);
          }}
          disabled={isVariantDisabled(variantName)}
          className={`mt-2 grid gap-y-6 grid-cols-2 gap-x-4 ${
            isVariantDisabled(variantName)
              ? "opacity-50 pointer-events-none"
              : ""
          }`}
        >
          {buttonOptions.map((optionValue: string | { value?: string; slug?: string; name?: string }) => {
            if (optionValue) {
              const optionName = processOptionValue(variantName, optionValue);
              let optionCode = null;

              // Extract raw string value for color code matching
              const rawOptionValue = typeof optionValue === 'object' && optionValue !== null
                ? (optionValue.value || optionValue.slug || optionValue.name || '')
                : String(optionValue || '');

              if (
                variantName.toLowerCase() === "color" &&
                rawOptionValue.includes("(")
              ) {
                // Extract color code
                const colorMatch = rawOptionValue.match(/\((#\w+)\)/);
                if (colorMatch) {
                  optionCode = colorMatch[1].trim();
                }
              }

              // const selectedOptionValue = selectedOptions[variantName];
              // const isChecked = selectedOptionValue === optionName;

              // Determine if the option is sold out
              let isOptionSoldOut = false;
              const isVariantDisabledState = isVariantDisabled(variantName);

              // Only check sold out status if the variant is enabled (not disabled)
              if (!isVariantDisabledState) {
                // Normalize function for matching
                const normalize = (str: string) => str?.toLowerCase()?.replace(/_/g, ' ')?.replace(/-/g, ' ')?.trim() || '';

                // Get current selections (case-insensitive)
                const currentStorage = selectedOptions["storage"] || selectedOptions["Storage"] || "";
                const currentCondition = selectedOptions["condition"] || selectedOptions["Condition"] || "";

                // Implement sold out logic using normalized option values
                if (variantName.toLowerCase() === "color") {
                  // Check if this specific color option is sold out
                  const variantCombination = product.variantValues.find(
                    (v: { name: string }) => {
                      const normalizedVariantName = normalize(v.name);
                      const normalizedColor = normalize(optionName);
                      const normalizedStorage = normalize(currentStorage);
                      const normalizedCondition = normalize(currentCondition);

                      return (
                        normalizedVariantName.includes(normalizedColor) &&
                        normalizedVariantName.includes(normalizedStorage) &&
                        normalizedVariantName.includes(normalizedCondition)
                      );
                    }
                  );

                  isOptionSoldOut = checkIfSoldOut(variantCombination);
                } else if (variantName.toLowerCase() === "storage") {
                  // Check if all color options are sold out for this storage and condition
                  const normalizedOptionName = normalize(optionName);
                  const normalizedCondition = normalize(currentCondition);

                  const allColorsSoldOut = product.variantValues
                    .filter(
                      (v: { name: string }) => {
                        const normalizedVariantName = normalize(v.name);
                        return normalizedVariantName.includes(normalizedOptionName) &&
                          normalizedVariantName.includes(normalizedCondition);
                      }
                    )
                    .every((v: { name: string }) => checkIfSoldOut(v));

                  isOptionSoldOut = allColorsSoldOut;
                } else if (variantName.toLowerCase() === "condition") {
                  // Check if all color and storage options are sold out for this condition
                  const normalizedOptionName = normalize(optionName);
                  const normalizedStorage = normalize(currentStorage);

                  const allColorsSoldOut = product.variantValues
                    .filter(
                      (v: { name: string }) => {
                        const normalizedVariantName = normalize(v.name);
                        return normalizedVariantName.includes(normalizedStorage) &&
                          normalizedVariantName.includes(normalizedOptionName);
                      }
                    )
                    .every((v: { name: string }) => checkIfSoldOut(v));

                  const allStorageSoldOut = product.variantValues
                    .filter((v: { name: string }) => {
                      const normalizedVariantName = normalize(v.name);
                      return normalizedVariantName.includes(normalizedOptionName);
                    })
                    .every((v: { name: string }) => checkIfSoldOut(v));

                  isOptionSoldOut = allColorsSoldOut && allStorageSoldOut;
                }
              }
              const formatColorForDisplay = (colorName: string) => {
                return colorName.replace(/-/g, " "); // Replace hyphens with spaces
              };

              return (
                <Radio
                  key={optionName}
                  value={optionName}
                  disabled={isOptionSoldOut || isVariantDisabledState}
                  onMouseEnter={() => {
                    if (
                      variantName.toLowerCase() === "color" &&
                      !isVariantDisabledState
                    ) {
                      const imagePath = getPreviewImageForColor(optionName);
                      if (imagePath) {
                        setHoveredColor(optionName);
                        setPreviewImage(imagePath);
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    if (
                      variantName.toLowerCase() === "color" &&
                      !isVariantDisabledState
                    ) {
                      setHoveredColor(null);
                      setPreviewImage(null);
                    }
                  }}
                  className={({ checked }: { checked: boolean }) =>
                    classNames(
                      checked
                        ? "border-primary ring-1 ring-primary bg-[#e7f0ea] opacity relative z-10 overflow-hidden capitalize "
                        : "",
                      isOptionSoldOut
                        ? "opacity-90 cursor-not-allowed relative z-10 overflow-hidden"
                        : isVariantDisabledState
                        ? "opacity-50 cursor-not-allowed relative z-10 overflow-hidden"
                        : "cursor-pointer",
                      "relative flex rounded-lg border px-4 py-3 shadow-sm focus:outline-none hover:bg-gray-50 z-10 capitalize"
                    )
                  }
                >
                  {() => (
                    <>
                      {/* SEO-friendly anchor tag for variant URLs */}
                      <a
                        href={generateVariantUrl(variantName, optionName)}
                        className="absolute inset-0 z-20"
                        onClick={(e) => {
                          e.preventDefault();
                          if (!isOptionSoldOut && !isVariantDisabledState) {
                            handleOptionChange(variantName, optionName);
                          }
                        }}
                        aria-label={`Select ${variantName}: ${optionName}${
                          isOptionSoldOut ? " (Sold Out)" : ""
                        }`}
                        tabIndex={
                          isVariantDisabledState || isOptionSoldOut ? -1 : 0
                        }
                      />
                      <span
                        className={`flex justify-center w-full relative z-10 pointer-events-none ${
                          optionCode ? "flex-row gap-3" : "flex-col"
                        }`}
                      >
                        <span className="block md:text-sm text-[11px] font-medium text-gray-900 text-center">
                          {variantName.toLowerCase() === "storage"
                            ? optionName.toUpperCase()
                            : formatColorForDisplay(optionName)}
                        </span>
                        {optionCode && (
                          <span
                            className="inline-block w-4 h-4 rounded-full border border-black"
                            style={{ backgroundColor: optionCode }}
                          ></span>
                        )}

                        {/* Show Sold Out tag for individual colors */}
                        {isOptionSoldOut &&
                          variant.name.toLowerCase() === "color" && (
                            <span
                              className="absolute bottom-0 left-0 bg-red-600 text-white sm:text-[10px] text-[8px] text-center font-normal px-3 pt-[1px] transform rotate-45 origin-bottom-right"
                              style={{
                                transform:
                                  "translate(-22%, 125%) rotate(-45deg)",
                                transformOrigin: "bottom left",
                                width: "78px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Sold Out
                            </span>
                          )}

                        {isOptionSoldOut &&
                          variant.name.toLowerCase() === "storage" && (
                            <span
                              className="absolute bottom-0 left-0 bg-red-600 text-white sm:text-[10px] text-[8px] text-center font-normal px-3 pt-[1px] transform rotate-45 origin-bottom-right"
                              style={{
                                transform:
                                  "translate(-22%, 125%) rotate(-45deg)",
                                transformOrigin: "bottom left",
                                width: "78px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Sold Out
                            </span>
                          )}
                        {isOptionSoldOut &&
                          variant.name.toLowerCase() === "condition" && (
                            <span
                              className="w-[90px] absolute bottom-0 left-0 bg-red-600 text-white text-xs font-normal ps-6 py-0.5 transform -z-10 origin-bottom-left overflow-clip"
                              style={{
                                transform:
                                  "translate(-22%, 32%) rotate(-45deg)",
                                transformOrigin: "bottom left",
                                // textAlign: 'center',
                                whiteSpace: "nowrap",
                              }}
                            >
                              Sold Out
                            </span>
                          )}
                        {/* Display condition prices if variant is 'condition' */}
                        {variantName.toLowerCase() === "condition" && (
                          <span className="text-sm text-gray-900 text-center">
                            {conditionPrices.find((cond) => {
                              const conditionName =
                                cond.condition.split(" - ")[0];
                              // Normalize both values: replace underscores with spaces for comparison
                              const normalizedConditionName = conditionName.toLowerCase().replace(/_/g, ' ');
                              const normalizedOptionName = optionName.toLowerCase().replace(/_/g, ' ');
                              return normalizedConditionName === normalizedOptionName;
                            }) && (
                              <div className="flex justify-center items-center gap-5">
                                <s className="text-gray-700 font-medium">
                                  £
                                  {
                                    conditionPrices.find((cond: any) => {
                                      const conditionName =
                                        cond.condition.split(" - ")[0];
                                      const normalizedConditionName = conditionName.toLowerCase().replace(/_/g, ' ');
                                      const normalizedOptionName = optionName.toLowerCase().replace(/_/g, ' ');
                                      return normalizedConditionName === normalizedOptionName;
                                    })?.price
                                  }
                                </s>
                                <p className="text-base font-medium">
                                  {" "}
                                  £
                                  {
                                    conditionPrices.find((cond) => {
                                      const conditionName =
                                        cond.condition.split(" - ")[0];
                                      const normalizedConditionName = conditionName.toLowerCase().replace(/_/g, ' ');
                                      const normalizedOptionName = optionName.toLowerCase().replace(/_/g, ' ');
                                      return normalizedConditionName === normalizedOptionName;
                                    })?.salePrice
                                  }
                                </p>
                              </div>
                            )}
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </Radio>
              );
            }
            return null;
          })}
        </RadioGroup>

        {/* Dropdown for remaining options (more than 4) - Using react-select */}
        {hasMoreOptions && (
          <div className="mt-3">
            <Select
              instanceId={`variant-select-${variantName}`}
              value={
                isSelectionInDropdown
                  ? {
                      value: currentSelection,
                      label: currentSelection.replace(/-/g, " "),
                      image: getImageForOption(currentSelection),
                    }
                  : null
              }
              onChange={(selectedOption) => {
                if (selectedOption) {
                  handleOptionChange(variantName, (selectedOption as any).value);
                }
              }}
              options={dropdownOptions
                .filter((opt: any) => opt)
                .map((optionValue: string | { value?: string; slug?: string; name?: string }) => {
                  const optionName = processOptionValue(variantName, optionValue);
                  const imageUrl = getImageForOption(optionName);
                  return {
                    value: optionName,
                    label: optionName.replace(/-/g, " "),
                    image: imageUrl,
                  };
                })}
              formatOptionLabel={(option: any) => (
                <div className="flex items-center gap-3">
                  {option.image && (
                    <div className="w-8 h-8 flex-shrink-0 overflow-hidden rounded border border-gray-200">
                      <img
                        src={option.image}
                        alt={option.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <span className="capitalize">{option.label}</span>
                </div>
              )}
              isDisabled={isVariantDisabled(variantName)}
              isSearchable={false}
              placeholder={`More ${formatVariantName(variantName)} Options (${dropdownOptions.length})`}
              noOptionsMessage={() => "No options found"}
              classNamePrefix="react-select"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
              styles={{
                control: (base, state) => ({
                  ...base,
                  borderRadius: "0.5rem",
                  borderColor: isSelectionInDropdown
                    ? "var(--primary)"
                    : state.isFocused
                    ? "var(--primary)"
                    : "#d1d5db",
                  boxShadow: isSelectionInDropdown
                    ? "0 0 0 1px var(--primary)"
                    : state.isFocused
                    ? "0 0 0 1px var(--primary)"
                    : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  backgroundColor: isSelectionInDropdown
                    ? "color-mix(in srgb, var(--primary) 14%, white)"
                    : state.isDisabled
                    ? "#f3f4f6"
                    : "#ffffff",
                  padding: "0.25rem",
                  cursor: state.isDisabled ? "not-allowed" : "pointer",
                  opacity: state.isDisabled ? 0.5 : 1,
                  "&:hover": {
                    borderColor: "var(--primary)",
                  },
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected
                    ? "var(--primary)"
                    : state.isFocused
                    ? "color-mix(in srgb, var(--primary) 14%, white)"
                    : "#ffffff",
                  color: state.isSelected ? "#ffffff" : "#111827",
                  cursor: "pointer",
                  padding: "8px 12px",
                  "&:active": {
                    backgroundColor: "var(--primary)",
                  },
                }),
                singleValue: (base) => ({
                  ...base,
                  color: "#111827",
                }),
                placeholder: (base) => ({
                  ...base,
                  color: "#6b7280",
                }),
                menu: (base) => ({
                  ...base,
                  borderRadius: "0.5rem",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                  zIndex: 9999,
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  position: "absolute",
                }),
                menuList: (base) => ({
                  ...base,
                  maxHeight: "280px",
                  backgroundColor: "#ffffff",
                  padding: "4px 0",
                }),
                menuPortal: (base) => ({
                  ...base,
                  zIndex: 9999,
                }),
              }}
            />
          </div>
        )}
      </fieldset>
    );
  });
  return <>{variantFields}</>;
}
