function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'object' && value._id) {
    return String(value._id).trim().toLowerCase();
  }
  return String(value).trim().toLowerCase();
}

function lineKey(productId, variantId) {
  return `${normalizeId(productId)}::${normalizeId(variantId)}`;
}

module.exports = {
  normalizeId,
  lineKey,
};
