import { ProductData, SelectedVariant, ConditionPrices, ExtractedOptions } from "../../../../../types";

/**
 * Processes option value based on variant name
 */
export const processOptionValue = (variantName: string, optionValue: string): string => {
  let processedValue = optionValue.trim();
  if (variantName.toLowerCase() === "color") {
    // Remove color codes like "(#000000)"
    processedValue = processedValue.replace(/\s*\(#\w+\)/, "").trim();
  }
  // Keep spaces between multi-word conditions like 'brand new'
  if (variantName.toLowerCase() === "condition") {
    return processedValue.toLowerCase().trim();
  }
  return processedValue.toLowerCase();
};

/**
 * Checks if a variant is sold out
 */
export const checkIfSoldOut = (variantCombination: {
  Quantity: number | null;
}): boolean => {
  return (
    variantCombination &&
    (variantCombination.Quantity === null ||
      variantCombination.Quantity === 0)
  );
};

/**
 * Finds initial selected variant
 */
export const findInitialSelectedVariant = (product: ProductData) => {
  if (!product?.variantValues || !product?.variantNames) return null;
  
  return product.variantValues.find((variant) => {
    return product.variantNames.every((v) => {
      const optionKey = v.name.trim();
      return variant.name.includes(optionKey);
    });
  });
};

/**
 * Extracts options from variant name
 */
export const extractOptionsFromVariantName = (variantName: string, hardDiskTypes: string[]): ExtractedOptions => {
  const hardDiskTypePattern = hardDiskTypes.map(escapeRegExp).join("|");
  const conditionRegex = /^(.*?)-/;
  const storageRegex = new RegExp(
    `(\\d+(?:GB|TB)(?:\\s*(?:${hardDiskTypePattern}))?)`,
    "i"
  );
  const colorRegex = new RegExp(
    `-(.*?)(\\(\\#\\w+\\))?-(\\d+(?:GB|TB)(?:\\s*(?:${hardDiskTypePattern}))?)`,
    "i"
  );

  const conditionMatch = variantName.match(conditionRegex);
  const storageMatch = variantName.match(storageRegex);
  const colorMatch = variantName.match(colorRegex);

  const condition = conditionMatch ? conditionMatch[1].trim() : "";
  const storage = storageMatch ? storageMatch[1].trim() : "";
  let color = colorMatch ? colorMatch[1].trim() : "";

  // Include color code if present
  const colorCode = colorMatch && colorMatch[2] ? colorMatch[2].trim() : "";
  color = `${color} ${colorCode}`.trim();

  return {
    condition: condition.toLowerCase(),
    color: color.toLowerCase(),
    storage: storage.toLowerCase(),
  };
};

/**
 * Helper function to escape special characters in regex
 */
export const escapeRegExp = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Find a variant based on selected options
 */
export const findVariant = (product: ProductData, selectedOptions: Record<string, string>) => {
  if (!product?.variantValues || !product?.variantNames) return null;
  
  return product.variantValues.find((variant: any) => {
    return product.variantNames.every((v) => {
      const optionKey = v.name.trim();
      let optionValue = selectedOptions[optionKey];
      if (!optionValue) return false;

      optionValue = processOptionValue(optionKey, optionValue);

      if (optionKey.toLowerCase() === "color") {
        const variantColor = variant.name
          .match(/-(.*?)\s*\(/i)?.[1]
          ?.toLowerCase()
          ?.trim();
        return variantColor === optionValue;
      } else {
        return variant.name.toLowerCase().includes(optionValue);
      }
    });
  });
};

/**
 * Parse variant parts from URL
 */
export const parseVariantParts = (
  parts: string[],
  conditionsList: string[],
  hardDiskTypes: string[]
): [string, string, string] => {
  let storage = "";
  let hardDriveType = "";
  let condition = "";
  let color = "";
  let conditionFound = false;

  // First, search for storage and hard drive type in the parts
  let storageIndex = -1;
  let hardDriveTypeIndex = -1;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/\d+(GB|TB)/i.test(part)) {
      storage = part;
      storageIndex = i;
    } else if (
      hardDiskTypes.some((hdt) => hdt.toLowerCase() === part.toLowerCase())
    ) {
      hardDriveType = part;
      hardDriveTypeIndex = i;
    }
  }

  // Combine storage and hard drive type if both are found
  if (storage && hardDriveType) {
    storage = `${storage} ${hardDriveType}`;
  } else if (hardDriveType && !storage) {
    storage = hardDriveType;
  }

  // Remove storage and hard drive type parts from parts array
  const remainingParts = parts.slice(); // clone the array

  if (storageIndex >= 0) {
    remainingParts.splice(storageIndex, 1);
    if (hardDriveTypeIndex > storageIndex) {
      hardDriveTypeIndex--;
    }
  }
  if (hardDriveTypeIndex >= 0) {
    remainingParts.splice(hardDriveTypeIndex, 1);
  }

  // Now, from the end, attempt to match known conditions
  for (let i = remainingParts.length; i > 0; i--) {
    const possibleConditionTwoWords = remainingParts
      .slice(i - 2, i)
      .join(" ")
      .toLowerCase();
    const possibleConditionOneWord = remainingParts[i - 1].toLowerCase();

    if (conditionsList.includes(possibleConditionTwoWords)) {
      condition = possibleConditionTwoWords;
      color = remainingParts.slice(0, i - 2).join("-"); // Keep hyphens in color
      conditionFound = true;
      break;
    } else if (conditionsList.includes(possibleConditionOneWord)) {
      condition = possibleConditionOneWord;
      color = remainingParts.slice(0, i - 1).join("-"); // Keep hyphens in color
      conditionFound = true;
      break;
    }
  }

  if (!conditionFound) {
    color = remainingParts.join("-"); // Keep hyphens in color
  }

  return [storage, color, condition];
};

/**
 * Extract base product name from full product name
 * Uses dynamic detection based on URL patterns (timestamp or storage)
 */
export const extractBaseProductName = (fullName: string) => {
  // Remove the leading '/' if present
  const cleanedName = fullName.startsWith("/")
    ? fullName.substring(1)
    : fullName;

  // The URL format is: {producturl}-{variant-slug}
  // producturl ends with a timestamp (e.g., "iphone-15-pro-1699012345678")
  // We detect the timestamp pattern to split base product from variant info

  // Pattern: product-name-{timestamp}-variant-info
  // Timestamp is 13 digits at the end of product URL
  const timestampPattern = /-(\d{13})(?:-|$)/;
  const timestampMatch = cleanedName.match(timestampPattern);

  if (timestampMatch && timestampMatch.index !== undefined) {
    // Found timestamp - everything before (including timestamp) is base product
    const timestampEndIndex = timestampMatch.index + timestampMatch[0].length;

    // Check if there's variant info after the timestamp
    if (timestampEndIndex < cleanedName.length) {
      const baseProductName = cleanedName.substring(0, timestampEndIndex - 1); // -1 to remove trailing dash
      const variantInfo = cleanedName.substring(timestampEndIndex);
      return { baseProductName, variantInfo };
    }

    // No variant info - just the base product
    return { baseProductName: cleanedName, variantInfo: "" };
  }

  // Fallback: Try storage pattern to detect where variant info starts
  // Storage pattern: e.g., 64gb, 128gb, 256gb, 512gb, 1tb, 2tb
  const storagePattern = /-([\d]+(?:gb|tb))(?:-|$)/i;
  const storageMatch = cleanedName.match(storagePattern);

  if (storageMatch && storageMatch.index !== undefined) {
    // Found storage size - variant info starts from storage
    const baseProductName = cleanedName.substring(0, storageMatch.index);
    const variantInfo = cleanedName.substring(storageMatch.index + 1);
    return { baseProductName, variantInfo };
  }

  // No variant pattern found - return the original name
  return { baseProductName: cleanedName, variantInfo: "" };
};

/**
 * Update selected variant when options change
 */
export const updateSelectedVariant = (
  product: ProductData,
  selectedOptions: Record<string, string>
): { 
  selectedVariant: SelectedVariant | null;
  conditionPrices: ConditionPrices[];
} => {
  const selectedStorageColorCombination = product?.variantValues?.find(
    (variant) => {
      return product.variantNames.every((v) => {
        const optionKey = v.name.trim();
        let selectedOption = selectedOptions[optionKey];
        if (!selectedOption) return false;
        selectedOption = processOptionValue(optionKey, selectedOption);
        if (optionKey.toLowerCase() === "color") {
          const variantColor = variant.name
            .match(/-(.*?)\s*\(/i)?.[1]
            ?.toLowerCase()
            ?.trim();
          return variantColor === selectedOption;
        } else {
          return variant.name.toLowerCase().includes(selectedOption);
        }
      });
    }
  );

  if (selectedStorageColorCombination) {
    const filteredVariants = product?.variantValues.filter((variant) => {
      const variantName = variant.name.toLowerCase();
      // Extract storage with optional hard drive type
      const variantColor = variantName.match(/-(.*?)\s*\(/i)?.[1]?.trim();
      const variantStorageMatch = variantName.match(
        /(\d+ ?(gb|tb))(?:\s*(hdd|ssd|hybrid sshd|nvme ssd|sas hdd|sata hdd|scsi hdd|ide hdd|m.2 ssd|u.2 ssd|pcie ssd))?/i
      );
      const variantStorage = variantStorageMatch
        ? variantStorageMatch[1]?.trim()
        : "";
      const variantHardDriveType = variantStorageMatch
        ? variantStorageMatch[3]?.trim()
        : "";
      // Combine storage and hard drive type if both exist
      const variantFullStorage = variantHardDriveType
        ? `${variantStorage} ${variantHardDriveType}`
        : variantStorage;
      const selectedColor = selectedOptions["color"];
      const selectedStorage = selectedOptions["storage"];
      return (
        variantColor === selectedColor &&
        variantFullStorage === selectedStorage
      );
    });

    const conditionPrices = filteredVariants?.map((variant) => {
      const variantName = variant.name;
      const conditionMatch = variantName.match(/^([^‐-]+)-/i);
      const condition = conditionMatch ? conditionMatch[1] : null;
      const colorMatch = variantName.match(/-(.*?)\s*\(/i);
      const color = colorMatch ? colorMatch[1] : null;
      const storageMatch = variantName.match(
        /(\d+ ?(GB|TB))(?:\s*(HDD|SSD|Hybrid SSHD|NVMe SSD|SAS HDD|SATA HDD|SCSI HDD|IDE HDD|M.2 SSD|U.2 SSD|PCIe SSD))?/i
      );
      const storage = storageMatch
        ? `${storageMatch[1].trim()} ${
            storageMatch[3] ? storageMatch[3].trim() : ""
          }`.trim()
        : null;

      return {
        condition: `${condition} - ${color} - ${storage}`,
        price: variant.Price,
        salePrice: variant.salePrice,
      };
    });

    return {
      selectedVariant: selectedStorageColorCombination,
      conditionPrices: conditionPrices ?? []
    };
  } else {
    return {
      selectedVariant: null,
      conditionPrices: []
    };
  }
};
