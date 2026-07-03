function normalizeMetaSchema(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((s) => (typeof s === 'string' ? s.trim() : String(s)))
      .filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function seoPayloadFromSettings(doc) {
  if (!doc) {
    return {
      metaTitle: '',
      metaDescription: '',
      metaSchema: [],
      seoUpdatedAt: null,
    };
  }
  const raw =
    doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    metaTitle: typeof raw.metaTitle === 'string' ? raw.metaTitle : '',
    metaDescription:
      typeof raw.metaDescription === 'string' ? raw.metaDescription : '',
    metaSchema: normalizeMetaSchema(raw.metaSchema),
    seoUpdatedAt: raw.seoUpdatedAt || raw.updatedAt || null,
  };
}

function validateJsonLdString(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return { ok: true, value: '' };
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== 'object') {
      return { ok: false, message: 'JSON-LD must be a JSON object or array.' };
    }
    return { ok: true, value: trimmed };
  } catch {
    return { ok: false, message: 'Invalid JSON-LD. Check brackets and quotes.' };
  }
}

module.exports = {
  normalizeMetaSchema,
  seoPayloadFromSettings,
  validateJsonLdString,
};
