/**
 * Shared typography rules for SiteTheme (Mongo) and API validation.
 * Google families (incl. Cormorant Garamond) + Georgia (system stack). Keep in sync with Next `app/lib/fonts.ts`.
 */
const ALLOWED_FONTS = [
  'Poppins',
  'Roboto',
  'Inter',
  'Montserrat',
  'Cormorant Garamond',
  'Georgia',
];
const ALLOWED_WEIGHTS = [400, 500, 600, 700];
const ALLOWED_STYLES = ['normal', 'italic'];

const DEFAULT_TYPOGRAPHY = {
  h1: { font: 'Poppins', weight: 600, style: 'normal' },
  h2: { font: 'Georgia', weight: 400, style: 'italic' },
  h3: { font: 'Roboto', weight: 500, style: 'normal' },
  /** Body + most UI text inherit `p` — default Roboto so “Inter” is never implicit. */
  p: { font: 'Roboto', weight: 400, style: 'normal' },
};

const FONT_BY_LC = {
  poppins: 'Poppins',
  roboto: 'Roboto',
  inter: 'Inter',
  montserrat: 'Montserrat',
  'cormorant garamond': 'Cormorant Garamond',
  cormorantgaramond: 'Cormorant Garamond',
  cormorant_garamond: 'Cormorant Garamond',
  georgia: 'Georgia',
};

function coerceFont(raw, fallbackFont) {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return fallbackFont;
  const canon = FONT_BY_LC[s.toLowerCase()];
  if (canon) return canon;
  return fallbackFont;
}

function coerceLevel(input, fallback) {
  const raw = input && typeof input === 'object' ? input : {};
  const font = coerceFont(raw.font, fallback.font);
  const w = Number(raw.weight);
  const weight = ALLOWED_WEIGHTS.includes(w) ? w : fallback.weight;
  const style = ALLOWED_STYLES.includes(raw.style) ? raw.style : fallback.style;
  return { font, weight, style };
}

/**
 * @param {unknown} typographyOrBody - `{ typography: {...} }` or flat `{ h1, ... }`
 * @returns {typeof DEFAULT_TYPOGRAPHY}
 */
function sanitizeTypography(typographyOrBody) {
  const t =
    typographyOrBody &&
    typeof typographyOrBody === 'object' &&
    typographyOrBody.typography &&
    typeof typographyOrBody.typography === 'object'
      ? typographyOrBody.typography
      : typographyOrBody;

  if (!t || typeof t !== 'object') {
    return {
      h1: { ...DEFAULT_TYPOGRAPHY.h1 },
      h2: { ...DEFAULT_TYPOGRAPHY.h2 },
      h3: { ...DEFAULT_TYPOGRAPHY.h3 },
      p: { ...DEFAULT_TYPOGRAPHY.p },
    };
  }

  return {
    h1: coerceLevel(t.h1, DEFAULT_TYPOGRAPHY.h1),
    h2: coerceLevel(t.h2, DEFAULT_TYPOGRAPHY.h2),
    h3: coerceLevel(t.h3, DEFAULT_TYPOGRAPHY.h3),
    p: coerceLevel(t.p, DEFAULT_TYPOGRAPHY.p),
  };
}

function mergeStoredTypography(docTypography) {
  if (!docTypography || typeof docTypography !== 'object') {
    return sanitizeTypography(null);
  }
  return sanitizeTypography(docTypography);
}

module.exports = {
  ALLOWED_FONTS,
  ALLOWED_WEIGHTS,
  ALLOWED_STYLES,
  DEFAULT_TYPOGRAPHY,
  sanitizeTypography,
  mergeStoredTypography,
};
