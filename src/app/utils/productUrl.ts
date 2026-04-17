/**
 * Strip trailing 13-digit numeric timestamps from product URL slugs.
 * e.g. "luxury-hilton-car-air-freshener-vent-clip-1776179916702"
 *    → "luxury-hilton-car-air-freshener-vent-clip"
 *
 * Leaves URLs that don't end with a 13-digit segment untouched.
 */
export function cleanProductSlug(slug: string | undefined | null): string {
  if (!slug) return "";
  return slug.replace(/-\d{13}$/, "");
}
