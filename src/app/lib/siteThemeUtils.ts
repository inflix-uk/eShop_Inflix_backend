/** Fallbacks aligned with `globals.css` and `/api/site-theme` route. */
export const DEFAULT_SITE_THEME = {
  primaryColor: "#16a34a",
  secondaryColor: "#15803d",
  primaryRgb: "22 163 74",
  secondaryRgb: "21 128 61",
} as const;

export function hexToRgbSpaceSeparated(hex: string): string | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${r} ${g} ${b}`;
}

export type SiteThemeResolved = {
  primaryColor: string;
  secondaryColor: string;
  primaryRgb: string;
  secondaryRgb: string;
};

export function resolveSiteTheme(
  primaryColor: string,
  secondaryColor: string
): SiteThemeResolved {
  const pr = hexToRgbSpaceSeparated(primaryColor);
  const sr = hexToRgbSpaceSeparated(secondaryColor);
  const p = pr != null ? primaryColor.trim() : DEFAULT_SITE_THEME.primaryColor;
  const s = sr != null ? secondaryColor.trim() : DEFAULT_SITE_THEME.secondaryColor;
  const primaryRgb =
    pr ?? hexToRgbSpaceSeparated(p) ?? DEFAULT_SITE_THEME.primaryRgb;
  const secondaryRgb =
    sr ?? hexToRgbSpaceSeparated(s) ?? DEFAULT_SITE_THEME.secondaryRgb;
  return {
    primaryColor: p,
    secondaryColor: s,
    primaryRgb,
    secondaryRgb,
  };
}

/** Single `:root` block for `<style>` in document head (overrides `globals.css`). */
export function siteThemeRootStyleCss(theme: SiteThemeResolved): string {
  return `:root{--primary:${theme.primaryColor};--secondary:${theme.secondaryColor};--primary-rgb:${theme.primaryRgb};--secondary-rgb:${theme.secondaryRgb};}`;
}
