/**
 * Server-side booking price validation — never trust client amounts or extra prices.
 */

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Resolve client-selected extras against the package catalog (by index or title).
 */
function validateExtrasAgainstPackage(clientExtras, packageExtras) {
  if (!Array.isArray(clientExtras) || clientExtras.length === 0) {
    return { extras: [], extrasSubtotal: 0 };
  }

  const catalog = Array.isArray(packageExtras) ? packageExtras : [];
  const seen = new Set();
  const normalized = [];

  for (const item of clientExtras) {
    const rawTitle = String(item?.title || '').trim();
    if (!rawTitle) continue;

    let catalogEntry = null;

    if (item.index !== undefined && item.index !== null && !Number.isNaN(Number(item.index))) {
      const idx = Number(item.index);
      if (idx >= 0 && idx < catalog.length) {
        catalogEntry = catalog[idx];
      }
    }

    if (!catalogEntry) {
      catalogEntry = catalog.find((e) => String(e?.title || '').trim() === rawTitle);
    }

    if (!catalogEntry || !String(catalogEntry.title || '').trim()) {
      return { error: `Invalid or unknown extra: ${rawTitle}` };
    }

    const key = String(catalogEntry.title).trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({
      image: catalogEntry.image ? String(catalogEntry.image).trim() : '',
      title: String(catalogEntry.title).trim(),
      price: Math.max(0, Number(catalogEntry.price) || 0),
      description: catalogEntry.description ? String(catalogEntry.description).trim() : '',
    });
  }

  const extrasSubtotal = normalized.reduce((sum, e) => sum + (e.price || 0), 0);
  return { extras: normalized, extrasSubtotal };
}

function computeBookingTotals(packagePrice, slotCount, extrasSubtotal = 0) {
  const price = Math.max(0, Number(packagePrice) || 0);
  const slots = Math.max(1, Number(slotCount) || 1);
  const slotsSubtotal = Math.round(price * slots * 100) / 100;
  const extras = Math.max(0, Number(extrasSubtotal) || 0);
  const totalAmount = Math.round((slotsSubtotal + extras) * 100) / 100;
  return { slotsSubtotal, extrasSubtotal: extras, totalAmount };
}

function amountsMatch(expected, received, toleranceCents = 1) {
  const a = Math.round(Number(expected) * 100);
  const b = Math.round(Number(received) * 100);
  return Math.abs(a - b) <= toleranceCents;
}

module.exports = {
  normalizeEmail,
  validateExtrasAgainstPackage,
  computeBookingTotals,
  amountsMatch,
};
