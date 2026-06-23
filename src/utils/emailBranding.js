/**
 * Resolves store logo + site theme colors for transactional HTML emails.
 * Data sources: Mongo `logo` (admin → Logo) and `sitewidecolor` (admin → Site theme).
 */

const SiteTheme = require('../models/siteTheme');
const Logo = require('../models/logo');
const { mergeStoredTypography } = require('./typographyConstants');

const DEFAULT_PRIMARY = '#25af60';
const DEFAULT_SECONDARY = '#0e231c';

function normalizeHex(input, fallback) {
  if (typeof input !== 'string') return fallback;
  const v = input.trim();
  if (!v || v.toLowerCase() === 'transparent') return fallback;
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function hexToRgb(hex) {
  const h = normalizeHex(hex, DEFAULT_PRIMARY).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function mixRgb(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function rgbToString(rgb) {
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

function rgbToCss(rgb) {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function rgbToHex(rgb) {
  const h = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`;
}

function mixHex(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToCss(mixRgb(A, B, t));
}

function backendPublicBase() {
  const raw =
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    `http://127.0.0.1:${process.env.PORT || 4000}`;
  return String(raw).replace(/\/+$/, '');
}

/**
 * Make logo URL absolute for email clients (many block relative URLs).
 */
function resolveLogoAbsoluteUrl(logoUrl) {
  if (!logoUrl || typeof logoUrl !== 'string') return '';
  const u = logoUrl.trim();
  if (/^https?:\/\//i.test(u)) return u;
  const base = backendPublicBase();
  const pathPart = u.startsWith('/') ? u : `/${u}`;
  return `${base}${pathPart}`;
}

function escapeHtmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * CSS font stack for SiteTheme typography level (Google families + Georgia system stack).
 * @param {{ font: string }} level
 */
function fontFamilyStack(level) {
  const name = level && level.font ? String(level.font) : 'Roboto';
  if (name === 'Georgia') {
    return "Georgia, 'Times New Roman', Times, serif";
  }
  return `'${name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', Arial, Helvetica, sans-serif`;
}

/**
 * Inline style fragment: font-family, font-weight, font-style (for HTML style attributes).
 * @param {{ font: string, weight: number, style: string }} level
 */
function typographyLevelToInlineCss(level) {
  return `font-family: ${fontFamilyStack(level)}; font-weight: ${level.weight}; font-style: ${level.style};`;
}

/**
 * Build Google Fonts CSS2 URL for all non-Georgia families referenced in typography.
 * @param {object} typography merged theme typography (h1–p levels)
 * @returns {string} href or '' if nothing to load from Google
 */
function buildGoogleFontsCss2Href(typography) {
  const levels = [typography.h1, typography.h2, typography.h3, typography.p];
  /** @type {Map<string, { normal: Set<number>, italic: Set<number> }>} */
  const byFont = new Map();

  for (const lev of levels) {
    if (!lev || lev.font === 'Georgia') continue;
    if (!byFont.has(lev.font)) {
      byFont.set(lev.font, { normal: new Set(), italic: new Set() });
    }
    const g = byFont.get(lev.font);
    if (lev.style === 'italic') g.italic.add(lev.weight);
    else g.normal.add(lev.weight);
  }

  if (byFont.size === 0) return '';

  const families = [];
  for (const [fontName, { normal, italic }] of byFont) {
    const enc = encodeURIComponent(fontName).replace(/%20/g, '+');
    const hasItalic = italic.size > 0;
    if (!hasItalic) {
      const weights = [...normal].sort((a, b) => a - b);
      if (weights.length === 0) continue;
      families.push(`${enc}:wght@${weights.join(';')}`);
    } else {
      const pairs = [];
      for (const w of [...normal].sort((a, b) => a - b)) pairs.push(`0,${w}`);
      for (const w of [...italic].sort((a, b) => a - b)) pairs.push(`1,${w}`);
      const uniq = [...new Set(pairs)];
      families.push(`${enc}:ital,wght@${uniq.join(';')}`);
    }
  }

  if (families.length === 0) return '';

  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;
}

function googleFontsLinkTag(href) {
  if (!href) return '';
  return `<link href="${escapeHtmlAttr(href)}" rel="stylesheet" />`;
}

/**
 * @returns {Promise<{
 *   logoUrl: string,
 *   logoAlt: string,
 *   primaryHex: string,
 *   secondaryHex: string,
 *   heroHeaderBg: string,
 *   footerBg: string,
 *   heroHighlightRgb: string,
 *   accentRgbCss: string,
 *   accentHex: string,
 *   mintBg: string,
 *   textDark: string,
 *   helpPanelBg: string,
 *   stepIconColor: string,
 *   typography: object,
 *   googleFontsHref: string,
 *   typo_h1: string,
 *   typo_h2: string,
 *   typo_h3: string,
 *   typo_p: string,
 * }>}
 */
async function getEmailBranding() {
  let primaryHex = DEFAULT_PRIMARY;
  let secondaryHex = DEFAULT_SECONDARY;
  let typography = mergeStoredTypography(null);

  try {
    const theme = await SiteTheme.getTheme();
    if (theme) {
      typography = mergeStoredTypography(theme.typography);
      const p = normalizeHex(String(theme.primaryColor || ''), '');
      const s = normalizeHex(String(theme.secondaryColor || ''), '');
      if (p) primaryHex = p;
      if (s) secondaryHex = s;
    }
  } catch {
    /* ignore */
  }

  const googleFontsHref = buildGoogleFontsCss2Href(typography);

  const primaryRgb = hexToRgb(primaryHex);
  const secondaryRgb = hexToRgb(secondaryHex);
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };
  const cream = { r: 255, g: 250, b: 233 };

  const heroHeaderBg = rgbToCss(mixRgb(primaryRgb, black, 0.78));
  /** Order status email header (customer) — deep tint of primary */
  const statusHeaderBg = rgbToCss(mixRgb(primaryRgb, black, 0.42));
  const footerBg = rgbToCss(mixRgb(primaryRgb, black, 0.75));
  const heroHighlightRgb = rgbToCss(mixRgb(primaryRgb, white, 0.72));
  const accentRgbCss = rgbToCss(primaryRgb);
  const mintBg = rgbToCss(mixRgb(primaryRgb, white, 0.92));
  const textDarkRgb = mixRgb(primaryRgb, black, 0.55);
  const textDark = rgbToCss(textDarkRgb);
  const textDarkHex = rgbToHex(textDarkRgb);
  const textDarkMutedRgba = `rgba(${textDarkRgb.r}, ${textDarkRgb.g}, ${textDarkRgb.b}, 0.65)`;
  const helpPanelBg = rgbToCss(mixRgb(mixRgb(primaryRgb, cream, 0.5), white, 0.85));
  const stepIconColor = accentRgbCss;
  const tradeInTint = { r: 240, g: 253, b: 244 };
  const tradeInPanelBg = rgbToCss(mixRgb(primaryRgb, tradeInTint, 0.55));

  let logoUrl = '';
  let logoAlt = 'Store';
  try {
    const logoDoc = await Logo.getLogo();
    if (logoDoc) {
      logoAlt = String(logoDoc.altText || 'Logo').trim() || 'Logo';
      logoUrl = resolveLogoAbsoluteUrl(logoDoc.logoUrl);
    }
  } catch {
    /* ignore */
  }

  if (!logoUrl) {
    const fb = String(process.env.EMAIL_FALLBACK_LOGO_URL || '').trim();
    logoUrl = fb || '';
  }

  return {
    logoUrl,
    logoAlt,
    primaryHex,
    secondaryHex,
    heroHeaderBg,
    statusHeaderBg,
    footerBg,
    heroHighlightRgb,
    accentRgbCss,
    accentHex: primaryHex,
    mintBg,
    textDark,
    textDarkHex,
    textDarkMutedRgba,
    helpPanelBg,
    stepIconColor,
    tradeInPanelBg,
    typography,
    googleFontsHref,
    typo_h1: typographyLevelToInlineCss(typography.h1),
    typo_h2: typographyLevelToInlineCss(typography.h2),
    typo_h3: typographyLevelToInlineCss(typography.h3),
    typo_p: typographyLevelToInlineCss(typography.p),
  };
}

function storefrontOriginForEmail() {
  const raw = process.env.FRONTEND_URL || process.env.STORE_URL || '';
  const t = String(raw).trim().replace(/\/+$/, '');
  return t || '';
}

/**
 * Inject {{EB_*}} tokens into HTML (run before OC_/ST_/SH_ copy replacement).
 * Includes site logo, theme colors, typography, Google Fonts link, and {{EB_store_url}} (FRONTEND_URL, escaped for href).
 * @param {string} html
 * @returns {Promise<string>}
 */
async function applyEmailBrandingToHtml(html, preloadedBranding) {
  const b = preloadedBranding || (await getEmailBranding());
  const tokens = {
    EB_logoUrl: escapeHtmlAttr(b.logoUrl),
    EB_logoAlt: escapeHtmlAttr(b.logoAlt),
    EB_store_url: escapeHtmlAttr(storefrontOriginForEmail()),
    EB_hero_header_bg: b.heroHeaderBg,
    EB_status_header_bg: b.statusHeaderBg,
    EB_footer_bg: b.footerBg,
    EB_hero_highlight: b.heroHighlightRgb,
    EB_accent_rgb: b.accentRgbCss,
    EB_accent: b.accentHex,
    EB_mint_bg: b.mintBg,
    EB_text_dark: b.textDark,
    EB_help_bg: b.helpPanelBg,
    EB_trade_in_panel_bg: b.tradeInPanelBg,
    EB_step_icon_color: b.stepIconColor,
    EB_google_fonts_link: googleFontsLinkTag(b.googleFontsHref),
    EB_typo_h1: b.typo_h1,
    EB_typo_h2: b.typo_h2,
    EB_typo_h3: b.typo_h3,
    EB_typo_p: b.typo_p,
  };

  let out = html;
  for (const [key, val] of Object.entries(tokens)) {
    const token = `{{${key}}}`;
    out = out.split(token).join(val);
  }
  return out;
}

/**
 * Replace hardcoded greens in shipped email CSS (#16a34a etc.) with theme primary.
 */
async function applyEmailBrandingToShippedHtml(html) {
  const b = await getEmailBranding();
  const darkGreen = mixHex(b.primaryHex, '#000000', 0.15);
  let out = html;
  out = out.split('#16a34a').join(b.primaryHex);
  out = out.split('#128e3b').join(darkGreen);
  return out;
}

module.exports = {
  getEmailBranding,
  applyEmailBrandingToHtml,
  applyEmailBrandingToShippedHtml,
  resolveLogoAbsoluteUrl,
  storefrontOriginForEmail,
  /** Builds `<link>` for Google Fonts when `href` is non-empty (same as order confirmation emails). */
  googleFontsLinkTag,
};
