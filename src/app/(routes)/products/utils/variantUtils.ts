/**
 * Utility functions for product variant handling
 *
 * SEO-FRIENDLY NAMING CONVENTION:
 * - Hyphen (-) is used for ALL separators (both word separators and attribute separators)
 * - This creates clean, SEO-friendly URLs like: brand-new-red-32gb
 *
 * NEW FORMAT: brand-new-red-32gb (hyphens only - SEO friendly)
 * OLD FORMAT: brand_new-red-32gb (underscore for spaces - being phased out)
 *
 * The code supports both formats for backwards compatibility during migration
 */

/**
 * Converts a slug back to human-readable format
 * Supports both old (underscore) and new (hyphen) formats
 * Example: "brand-new" -> "Brand New", "brand_new" -> "Brand New"
 */
export function slugToReadable(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')  // Replace both hyphens and underscores with spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize first letter of each word
}

/**
 * Converts a human-readable value to SEO-friendly slug format (hyphen-only)
 * Example: "Brand New" -> "brand-new", "Sky Blue" -> "sky-blue"
 */
export function readableToSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
    .replace(/-+/g, '-');         // Replace multiple hyphens with single
}

/**
 * Parses a variant name into its component parts
 * Uses the dynamic naming convention: underscore for same word, hyphen for different attributes
 *
 * Example: "brand_new-sky_blue-256gb" -> ["brand_new", "sky_blue", "256gb"]
 * Each part can be converted to readable format using slugToReadable()
 */
export function parseVariantParts(variantName: string): string[] {
  // Remove any color codes like (#161e24) before parsing
  const cleanedName = variantName.replace(/\s*\(#[a-fA-F0-9]+\)/g, '');

  // Split by hyphen to get individual attribute values
  return cleanedName.split('-').filter(part => part.trim() !== '');
}

/**
 * Parses a variant name to extract condition, color, and storage
 * FULLY DYNAMIC - uses naming convention instead of hardcoded lists
 *
 * Example: "brand_new-sky_blue-256gb" -> { condition: "brand_new", color: "sky_blue", storage: "256gb" }
 */
export function parseVariantName(variantName: string) {
  const parts = parseVariantParts(variantName);

  let condition: string | null = null;
  let color: string | null = null;
  let storage: string | null = null;

  // Storage pattern: digits followed by GB, TB, or with disk type
  const storagePattern = /^\d+\s*(?:gb|tb)(?:_?(?:ssd|hdd|nvme|m\.?2))?$/i;

  for (const part of parts) {
    const lowerPart = part.toLowerCase();

    if (storagePattern.test(lowerPart)) {
      // This is storage (e.g., "256gb", "1tb", "512gb_ssd")
      storage = lowerPart;
    } else if (!condition) {
      // First non-storage part is typically condition
      condition = lowerPart;
    } else if (!color) {
      // Second non-storage part is typically color
      color = lowerPart;
    }
  }

  return {
    condition,
    color,
    storage,
  };
}

/**
 * Generates an SEO-friendly slug from variant name (hyphen-only)
 * Converts underscores to hyphens for clean URLs
 *
 * Example: "brand_new-sky_blue-256gb" -> "brand-new-sky-blue-256gb"
 *
 * Convention:
 * - Hyphen (-) = used for ALL separators (SEO-friendly)
 */
export function generateVariantSlug(variantName: string): string {
  if (!variantName) return '';

  // Convert underscores to hyphens and clean up
  return variantName
    .toLowerCase()
    .replace(/_/g, '-')           // Convert underscores to hyphens
    .replace(/[^a-z0-9-]+/g, '-') // Replace other special chars with hyphen
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
    .replace(/-+/g, '-');         // Replace multiple hyphens with single
}

/**
 * Generates a full product URL with variant slug
 * NEW FORMAT: /products/{productUrl}/{variantSlug}
 * This separates product URL from variant slug with a path separator
 */
export function generateVariantUrl(baseProductUrl: string, variantName: string): string {
  const slug = generateVariantSlug(variantName);

  if (!slug) {
    return `/products/${baseProductUrl}`;
  }

  // Use path separator (/) instead of hyphen (-) to clearly separate product URL from variant slug
  return `/products/${baseProductUrl}/${slug}`;
}

/**
 * Parses URL variant parts back to slug format
 * Supports both old (underscore) and new (hyphen-only) URL formats
 *
 * Example URLs:
 *   NEW: "brand-new-sky-blue-256gb"
 *   OLD: "brand_new-sky_blue-256gb"
 *
 * This function uses product variantNames to determine the correct parsing
 */
export function parseUrlVariantParts(
  urlParts: string[],
  variantNames: Array<{ name: string; options: Array<{ slug: string; value: string }> }>
): { [key: string]: string } {
  const result: { [key: string]: string } = {};

  // Build a map of all possible option slugs to their variant name
  // Store both hyphen and underscore versions for backwards compatibility
  const optionSlugToVariantName: { [slug: string]: string } = {};
  const allOptionSlugs: string[] = [];

  variantNames.forEach(variant => {
    variant.options.forEach(option => {
      const originalSlug = option.slug.toLowerCase();
      // Convert to hyphen format (new SEO format)
      const hyphenSlug = originalSlug.replace(/_/g, '-');

      optionSlugToVariantName[hyphenSlug] = variant.name.toLowerCase();
      optionSlugToVariantName[originalSlug] = variant.name.toLowerCase();

      allOptionSlugs.push(hyphenSlug);
      if (originalSlug !== hyphenSlug) {
        allOptionSlugs.push(originalSlug);
      }
    });
  });

  // Sort by length descending to match longer slugs first (e.g., "brand-new" before "new")
  allOptionSlugs.sort((a, b) => b.length - a.length);

  // Join URL parts - convert underscores to hyphens for matching
  let remainingUrl = urlParts.join('-').toLowerCase();

  for (const slug of allOptionSlugs) {
    // Try matching both formats
    if (remainingUrl.includes(slug)) {
      const variantName = optionSlugToVariantName[slug];
      if (variantName && !result[variantName]) {
        result[variantName] = slug;
        // Remove matched part from remaining URL
        remainingUrl = remainingUrl.replace(slug, '').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
      }
    }
  }

  return result;
}

/**
 * Find variant by slug with fallback logic
 * Supports new slug field, variantId, and fuzzy matching on name
 *
 * @param variantValues - Array of variant value objects
 * @param urlSlug - The URL slug to match
 * @returns The matching variant or null
 */
export function findVariantBySlug(
  variantValues: Array<{ slug?: string; variantId?: string; name: string; [key: string]: any }>,
  urlSlug: string
): any | null {
  if (!variantValues || !urlSlug) return null;

  const normalizedUrlSlug = urlSlug.toLowerCase().replace(/_/g, '-');

  // 1. Try exact match on slug field (new SEO format)
  const bySlug = variantValues.find(v => v.slug === normalizedUrlSlug);
  if (bySlug) return bySlug;

  // 2. Try match on variantId
  const byVariantId = variantValues.find(v => v.variantId === urlSlug);
  if (byVariantId) return byVariantId;

  // 3. Try fuzzy match on name (convert name to slug format and compare)
  const byNameFuzzy = variantValues.find(v => {
    const nameSlug = generateVariantSlug(v.name);
    return nameSlug === normalizedUrlSlug;
  });
  if (byNameFuzzy) return byNameFuzzy;

  // 4. Try partial match (all URL parts exist in variant name)
  const urlParts = normalizedUrlSlug.split('-').filter(Boolean);
  const byPartialMatch = variantValues.find(v => {
    const nameSlug = generateVariantSlug(v.name);
    return urlParts.every(part => nameSlug.includes(part));
  });

  return byPartialMatch || null;
}
