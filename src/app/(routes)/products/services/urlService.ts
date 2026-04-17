import { ProductData, SelectedVariant } from "../../../../../types";
import { readableToSlug } from "../utils/variantUtils";

/**
 * Convert a value to URL-safe slug format
 * Uses underscore for words within same attribute, hyphen to separate attributes
 * Example: "Matte Space Gray" -> "matte_space_gray"
 */
const toUrlSlug = (value: string): string => {
  if (!value) return "";
  // If already in slug format (has underscores, no spaces), return as-is
  if (value.includes("_") && !value.includes(" ")) {
    return value.toLowerCase();
  }
  // Convert readable format to slug (spaces to underscores)
  return readableToSlug(value);
};

/**
 * Update product URL based on selected options
 *
 * URL Convention:
 * - Order: condition-color-storage (matches variant name format)
 * - Underscore (_) = words within same attribute value (e.g., "matte_space_gray")
 * - Hyphen (-) = separator between different attributes (e.g., "brand_new-matte_space_gray-64gb")
 */
export const updateProductUrl = (
  product: ProductData | undefined,
  selectedVariant: SelectedVariant | null,
  currentOptions: Record<string, string>
): void => {
  if (!product || !product.producturl) return;
  if (typeof window === "undefined") return;

  // Extract the variant components directly from currentOptions
  const storage = (currentOptions as { storage: string })["storage"] || "";
  const color = (currentOptions as { color: string })["color"] || "";
  const condition = (currentOptions as { condition: string })["condition"] || "";

  // Check if ALL required variants are selected (storage, color, condition)
  const hasAllRequiredVariants = storage && color && condition &&
    storage.trim() !== "" && color.trim() !== "" && condition.trim() !== "";

  const baseSlug = product.producturl?.replace(/-\d{13}$/, "") ?? product.producturl;

  if (!hasAllRequiredVariants) {
    const expectedUrl = `/products/${baseSlug}`;
    if (window.location.pathname !== expectedUrl) {
      console.log("Not all variants selected - updating URL to base:", expectedUrl);
      try {
        window.history.replaceState({}, "", expectedUrl);
        updateCanonicalUrl(baseSlug);
      } catch (e) {
        console.warn("Failed to update URL/canonical:", e);
      }
    }
    return;
  }

  const variantName = [condition, color, storage]
    .filter(Boolean)
    .map(toUrlSlug)
    .join("-");

  const expectedUrl = `/products/${baseSlug}/${variantName}`;

  // Update URL if different
  if (window.location.pathname !== expectedUrl) {
    console.log("Updating URL to:", expectedUrl);
    try {
      window.history.replaceState({}, "", expectedUrl);
      // Update canonical URL
      updateCanonicalUrl(`${baseSlug}/${variantName}`);
    } catch (e) {
      console.warn("Failed to update URL/canonical:", e);
    }
  }
};

/**
 * Update canonical URL tag in document head
 */
export const updateCanonicalUrl = (productUrlWithVariant: string): void => {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  // Find existing canonical link or create a new one
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  
  // Update the href attribute with the new URL
  const fullCanonicalUrl = `${window.location.origin}/products/${productUrlWithVariant}`;
  canonicalLink.href = fullCanonicalUrl;
};
