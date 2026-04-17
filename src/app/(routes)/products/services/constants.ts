// Centralized constants for the products route
//
// NOTE: Variant-related values (conditions, colors, storage) are now DYNAMIC
// and fetched from the database. No hardcoded variant values here.
//
// NAMING CONVENTION:
// - Underscore (_) separates words WITHIN the same attribute value (e.g., "brand_new" = "Brand New")
// - Hyphen (-) separates DIFFERENT attribute values (e.g., "brand_new-red-256gb")

// API endpoints used across product pages
export const API_ENDPOINTS = {
  GET_PRODUCT_BY_URL: process.env.NEXT_PUBLIC_API_URL + "/get/product/by/url",
} as const;

// Storage regex pattern for identifying storage values in variant names
// This is a format pattern, not hardcoded values
export const STORAGE_PATTERN = /^\d+\s*(?:gb|tb)(?:_?(?:ssd|hdd|nvme|m\.?2|hybrid_sshd|sas|sata|scsi|ide|u\.?2|pcie))?$/i;

// Date formatting options for delivery dates
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

// Delivery time settings
export const DELIVERY_TIME_CUTOFF_HOUR = 16;

// Battery option names
export const BATTERY_OPTION_NAMES = {
  STANDARD: "Standard Battery",
  NEW: "New Battery",
} as const;

// Storage regex patterns for variant name parsing
// These are FORMAT patterns, not hardcoded values
export const STORAGE_REGEX_PATTERNS = {
  // Pattern for matching storage: digits followed by GB/TB, optionally followed by disk type suffix
  // The disk type is captured as whatever follows the GB/TB (using underscore convention)
  // Examples: "256gb", "1tb", "512gb_ssd", "256gb_nvme_ssd"
  STORAGE_WITH_TYPE: /(\d+\s*(?:gb|tb))(?:_([a-z0-9_]+))?/i,

  // Simple storage pattern (GB/TB only)
  STORAGE_SIMPLE: /\d+\s*(?:gb|tb)/i,
} as const;

/**
 * Checks if a string matches storage format
 * Uses dynamic pattern matching without hardcoded disk types
 */
export function isStorageValue(value: string): boolean {
  return STORAGE_PATTERN.test(value);
}

/**
 * Parses storage value into capacity and optional disk type
 * Example: "512gb_ssd" -> { capacity: "512gb", diskType: "ssd" }
 */
export function parseStorageValue(value: string): { capacity: string; diskType: string | null } {
  const match = value.toLowerCase().match(STORAGE_REGEX_PATTERNS.STORAGE_WITH_TYPE);
  if (!match) {
    return { capacity: value, diskType: null };
  }
  return {
    capacity: match[1].replace(/\s+/g, ''),
    diskType: match[2] || null,
  };
}
