const SLUGS_WITHOUT_TOPBAR = new Set([
  "about-us",
  "refund-policy",
  "terms-of-service",
]);

export function slugHidesTopBar(slug: string): boolean {
  if (!slug) return false;
  try {
    return SLUGS_WITHOUT_TOPBAR.has(
      decodeURIComponent(slug).toLowerCase().trim()
    );
  } catch {
    return false;
  }
}

/** For client layouts (loading / error) where only pathname is available. */
export function pathnameHidesTopBarForSlugRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0]?.toLowerCase() === "footer-pages" && parts[1]) {
    return slugHidesTopBar(parts[1]);
  }
  const segment = parts[0];
  return segment ? slugHidesTopBar(segment) : false;
}
