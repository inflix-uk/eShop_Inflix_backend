export const normalizeColor = (color: string) => {
  return color.replace(/\s*\(#[a-fA-F0-9]+\)/, "").toLowerCase();
};
export const getSeoMetaData = (
  response: any,
  variantInfoFromUrl: string | null = null
) => {
  const productMetaData = response.productMetaData;
  const productType = response.productType?.type;

  if (!productMetaData || !productType) {
    console.warn("Product metadata or product type is missing.");
    return {
      metaTitle: "Default Title",
      metaDescription: "Default Description",
      metaKeywords: "",
      metaSchemas: [],
      metaImage: "",
    };
  }

  const defaultTitle = `Buy ${response.name} at Zextons`;
  const defaultDescription = `Get ${response.name} in excellent condition`;

  let metaTitle = defaultTitle;
  let metaDescription = defaultDescription;
  let metaKeywords = response.name || "";
  let metaSchemas = [];
  let metaImage = "";

  if (productType === "variant") {
    const variantValues = response.variantMetaDatas || [];
    let matchedVariant = null;

    if (variantInfoFromUrl && Array.isArray(variantValues)) {
      // Compare variant info from URL with the variant names
      matchedVariant = variantValues.find((variant: any) => {
        const sanitizedVariantName = variant.name.toLowerCase();
        const formattedUrlParts = variantInfoFromUrl
          .toLowerCase()
          .split("-")
          .filter(Boolean); // Remove empty parts

        return formattedUrlParts.every((part) =>
          sanitizedVariantName.includes(part)
        );
      });
    }

    const activeVariant = matchedVariant || variantValues[0];
    if (activeVariant) {
      metaTitle = activeVariant.metaTitle || defaultTitle;
      metaDescription = activeVariant.metaDescription || defaultDescription;
      metaKeywords = activeVariant.metaKeywords || response.name;
      metaSchemas = activeVariant.metaSchemas || [];
      metaImage = activeVariant.metaImage?.path || "";
    } else {
      console.warn("No matching variant found; using default metadata.");
    }
  } else if (productType === "single") {
    metaTitle = productMetaData.metaTitle || defaultTitle;
    metaDescription = productMetaData.metaDescription || defaultDescription;
    metaKeywords = productMetaData.metaKeywords || response.name;
    metaSchemas = productMetaData.metaSchemas || [];
    metaImage = response.meta_Image?.path || "";
  }

  return {
    metaTitle,
    metaDescription,
    metaKeywords,
    metaSchemas,
    metaImage,
  };
};

export const extractBaseProductName = (fullName: string) => {
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

export function getVariantFromUrlAndMetadata(
  apiResponse: any,
  urlPath: string
) {
  // Extract base product name and variant information from the URL
  const { variantInfo } = extractBaseProductName(
    urlPath.split("/").pop() || ""
  );

  if (!variantInfo) {
    return null;
  }

  const { variantMetaDatas } = apiResponse;

  if (!variantMetaDatas || !Array.isArray(variantMetaDatas)) {
    console.warn("Invalid variantMetaDatas in API response");
    return null;
  }

  // Normalize URL variant info (convert underscores to hyphens for matching)
  const normalizedUrlVariant = variantInfo.toLowerCase().replace(/_/g, "-");

  // 1. Try exact match on slug field (new SEO format)
  const bySlug = variantMetaDatas.find(
    (v: any) => v.slug === normalizedUrlVariant
  );
  if (bySlug) return bySlug;

  // 2. Try match on variantId
  const byVariantId = variantMetaDatas.find(
    (v: any) => v.variantId === variantInfo
  );
  if (byVariantId) return byVariantId;

  // 3. Try fuzzy match - convert variant name to slug and compare
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/\s*\(#[0-9a-f]+\)/gi, "") // Remove color codes
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  };

  const byNameSlug = variantMetaDatas.find((v: any) => {
    const nameSlug = generateSlug(v.name || "");
    return nameSlug === normalizedUrlVariant;
  });
  if (byNameSlug) return byNameSlug;

  // 4. Try partial match - all URL parts exist in variant name
  const urlParts = normalizedUrlVariant.split("-").filter(Boolean);
  const byPartialMatch = variantMetaDatas.find((metadata: any) => {
    const sanitizedVariantName = (metadata.name || "")
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/\s*\(#[0-9a-f]+\)/gi, ""); // Remove color codes

    return urlParts.every((part) => sanitizedVariantName.includes(part));
  });

  if (byPartialMatch) return byPartialMatch;

  console.warn("No matching variant found for URL variant info");
  return null;
}
