/**
 * Values arriving from the admin's multipart product forms.
 *
 * A multipart form sends null/undefined as the literal text "null" /
 * "undefined". Stored as-is, that text showed on the storefront ("null" as the
 * description) and crashed the admin edit page (subCategory "null").
 */
const cleanText = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value);
    return ['null', 'undefined'].includes(text.trim().toLowerCase()) ? null : text;
};

/** "true"/"false" from the form; null when the field was not really sent. */
const toBoolean = (value) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return null;
};

module.exports = { cleanText, toBoolean };
