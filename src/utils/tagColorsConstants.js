const HEX6 = /^#[0-9A-Fa-f]{6}$/;

const TAG_KEYS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span'];

const DEFAULT_TAG_COLORS = {
  h1: '#111827',
  h2: '#111827',
  h3: '#1f2937',
  h4: '#1f2937',
  h5: '#374151',
  h6: '#374151',
  p: '#374151',
  span: '#374151',
};

function normalizeHex(input) {
  if (typeof input !== 'string') return null;
  const v = input.trim();
  if (HEX6.test(v)) return v.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function coerceTagColor(raw, fallback) {
  const hex = normalizeHex(typeof raw === 'string' ? raw : '');
  return hex || fallback;
}

/**
 * @param {unknown} body - `{ tagColors: {...} }` or flat `{ h1, ... }`
 * @returns {typeof DEFAULT_TAG_COLORS}
 */
function sanitizeTagColors(body) {
  const t =
    body &&
    typeof body === 'object' &&
    body.tagColors &&
    typeof body.tagColors === 'object'
      ? body.tagColors
      : body;

  const src = t && typeof t === 'object' ? t : {};
  const out = {};
  for (const key of TAG_KEYS) {
    out[key] = coerceTagColor(src[key], DEFAULT_TAG_COLORS[key]);
  }
  return out;
}

/** Stored `''` → default for public API; valid hex → as stored. */
function mergeStoredTagColors(stored) {
  const src = stored && typeof stored === 'object' ? stored : {};
  const out = {};
  for (const key of TAG_KEYS) {
    const raw = typeof src[key] === 'string' ? src[key].trim() : '';
    out[key] = raw ? coerceTagColor(raw, DEFAULT_TAG_COLORS[key]) : DEFAULT_TAG_COLORS[key];
  }
  return out;
}

/** Admin payload: empty string = “use default” (not stored as override). */
function tagColorsAdminPayload(themeDoc) {
  const raw =
    themeDoc?.tagColors && typeof themeDoc.tagColors.toObject === 'function'
      ? themeDoc.tagColors.toObject()
      : themeDoc?.tagColors;
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const key of TAG_KEYS) {
    const v = typeof src[key] === 'string' ? src[key].trim() : '';
    out[key] = v && normalizeHex(v) ? normalizeHex(v) : '';
  }
  return out;
}

function tagColorsPublicPayload(themeDoc) {
  const raw =
    themeDoc?.tagColors && typeof themeDoc.tagColors.toObject === 'function'
      ? themeDoc.tagColors.toObject()
      : themeDoc?.tagColors;
  return mergeStoredTagColors(raw);
}

module.exports = {
  TAG_KEYS,
  DEFAULT_TAG_COLORS,
  sanitizeTagColors,
  mergeStoredTagColors,
  tagColorsAdminPayload,
  tagColorsPublicPayload,
  normalizeHex,
};
