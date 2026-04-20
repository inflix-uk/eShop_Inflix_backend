/**
 * Slug Utility Functions for SEO-Friendly URLs
 *
 * NAMING CONVENTION:
 * - Hyphen (-) is used for ALL separators (both word separators and attribute separators)
 * - This creates clean, SEO-friendly URLs like: brand-new-red-32gb
 *
 * OLD FORMAT: brand_new-red-32gb (underscore for spaces within values)
 * NEW FORMAT: brand-new-red-32gb (hyphens only - SEO friendly)
 */

const { nanoid } = require('nanoid');

/**
 * Convert text to SEO-friendly slug (hyphen-only)
 * Replaces spaces, underscores, and special characters with hyphens
 *
 * @param {string} text - The text to convert
 * @returns {string} - SEO-friendly slug
 *
 * @example
 * toSeoSlug('Brand New') // => 'brand-new'
 * toSeoSlug('Sky Blue') // => 'sky-blue'
 * toSeoSlug('brand_new') // => 'brand-new' (converts old format)
 */
function toSeoSlug(text) {
    if (!text) return '';
    return String(text)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphen
        .replace(/^-+|-+$/g, '')       // Remove leading/trailing hyphens
        .replace(/-+/g, '-');          // Replace multiple hyphens with single
}

/**
 * Generate a unique variant ID using nanoid
 *
 * @param {number} length - Length of the ID (default: 12)
 * @returns {string} - Unique variant ID
 *
 * @example
 * generateVariantId() // => 'V3IguMb-Qw_p'
 */
function generateVariantId(length = 12) {
    return nanoid(length);
}

/**
 * Generate variant slug from attributes array
 * Uses hyphen-only format for SEO-friendly URLs
 *
 * @param {Array} attributes - Array of attribute objects with valueSlug or value
 * @returns {string} - SEO-friendly variant slug
 *
 * @example
 * generateVariantSlug([
 *   { value: 'Brand New', valueSlug: 'brand_new' },
 *   { value: 'Red', valueSlug: 'red' },
 *   { value: '32GB', valueSlug: '32gb' }
 * ]) // => 'brand-new-red-32gb'
 */
function generateVariantSlug(attributes) {
    if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
        return '';
    }

    return attributes
        .map(attr => {
            // Prefer valueSlug, fallback to converting value
            const slug = attr.valueSlug || attr.value || '';
            // Convert underscore format to hyphen format
            return toSeoSlug(slug.replace(/_/g, '-'));
        })
        .filter(Boolean)
        .join('-');
}

/**
 * Convert variant name (old underscore format) to SEO slug (hyphen format)
 *
 * @param {string} variantName - Variant name in old format (e.g., 'brand_new-red-32gb')
 * @returns {string} - SEO-friendly slug (e.g., 'brand-new-red-32gb')
 *
 * @example
 * variantNameToSeoSlug('brand_new-red-32gb') // => 'brand-new-red-32gb'
 * variantNameToSeoSlug('excellent-sky_blue-256gb') // => 'excellent-sky-blue-256gb'
 */
function variantNameToSeoSlug(variantName) {
    if (!variantName) return '';

    // Replace underscores with hyphens and clean up
    return variantName
        .toLowerCase()
        .replace(/_/g, '-')           // Convert underscores to hyphens
        .replace(/[^a-z0-9-]+/g, '-') // Replace other special chars with hyphen
        .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
        .replace(/-+/g, '-');         // Replace multiple hyphens with single
}

/**
 * Convert SEO slug back to readable format
 *
 * @param {string} slug - SEO slug (e.g., 'brand-new')
 * @returns {string} - Readable format (e.g., 'Brand New')
 */
function seoSlugToReadable(slug) {
    if (!slug) return '';
    return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

module.exports = {
    toSeoSlug,
    generateVariantId,
    generateVariantSlug,
    variantNameToSeoSlug,
    seoSlugToReadable
};
