import { CMS_UPSTREAM_TIMEOUT_MS } from "@/app/lib/cmsTimedFetch";
import {
  DEFAULT_SITE_THEME,
  resolveSiteTheme,
  type SiteThemeResolved,
} from "@/app/lib/siteThemeUtils";

/**
 * Server-side fetch for public site theme (same source as `/api/site-theme`).
 * Used in root layout so `:root` CSS variables match the DB on first paint.
 */
export async function getSiteThemePublic(): Promise<SiteThemeResolved> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base) {
    return resolveSiteTheme(
      DEFAULT_SITE_THEME.primaryColor,
      DEFAULT_SITE_THEME.secondaryColor
    );
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), CMS_UPSTREAM_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/site-theme/public`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      return resolveSiteTheme(
        DEFAULT_SITE_THEME.primaryColor,
        DEFAULT_SITE_THEME.secondaryColor
      );
    }

    const json = await res.json();
    if (!json?.success || !json?.data) {
      return resolveSiteTheme(
        DEFAULT_SITE_THEME.primaryColor,
        DEFAULT_SITE_THEME.secondaryColor
      );
    }

    const primary = String(json.data.primaryColor ?? "").trim();
    const secondary = String(json.data.secondaryColor ?? "").trim();
    if (!primary || !secondary) {
      return resolveSiteTheme(
        DEFAULT_SITE_THEME.primaryColor,
        DEFAULT_SITE_THEME.secondaryColor
      );
    }

    return resolveSiteTheme(primary, secondary);
  } catch {
    return resolveSiteTheme(
      DEFAULT_SITE_THEME.primaryColor,
      DEFAULT_SITE_THEME.secondaryColor
    );
  } finally {
    clearTimeout(id);
  }
}
