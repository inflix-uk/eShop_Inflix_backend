/**
 * Server-side booking price validation — never trust client amounts or extra prices.
 */

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Resolve client-selected extras against the package catalog (by index or title).
 */
function validateExtrasAgainstPackage(clientExtras, packageExtras, options = {}) {
  if (!Array.isArray(clientExtras) || clientExtras.length === 0) {
    return { extras: [], extrasSubtotal: 0 };
  }

  const maxQuantity = Math.max(
    1,
    Math.min(9, Math.floor(Number(options.maxQuantity) || 9))
  );

  const catalog = Array.isArray(packageExtras) ? packageExtras : [];
  const seen = new Set();
  const normalized = [];

  for (const item of clientExtras) {
    const rawTitle = String(item?.title || '').trim();
    if (!rawTitle) continue;

    // Skip client-sent mic lines — server rebuilds them from extraMics + settings.
    if (/^extra microphone/i.test(rawTitle)) continue;

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

    const quantityEnabled = Boolean(catalogEntry.quantityEnabled);
    let quantity = 1;
    if (quantityEnabled) {
      quantity = Math.min(
        maxQuantity,
        Math.max(1, Math.floor(Number(item.quantity) || 1))
      );
    }

    normalized.push({
      image: catalogEntry.image ? String(catalogEntry.image).trim() : '',
      title: String(catalogEntry.title).trim(),
      /** Catalog unit price (£ per hour). Line total is applied via applyHourlyExtras. */
      price: Math.max(0, Number(catalogEntry.price) || 0),
      description: catalogEntry.description ? String(catalogEntry.description).trim() : '',
      quantity,
      quantityEnabled,
    });
  }

  const extrasSubtotal = normalized.reduce((sum, e) => {
    const qty = Math.max(1, Math.floor(Number(e.quantity) || 1));
    return sum + (e.price || 0) * qty;
  }, 0);
  return { extras: normalized, extrasSubtotal };
}

/**
 * Convert catalog unit-priced extras into line totals for N booked hours.
 * Returns new extras with `price` = unit × hours and a human-readable description.
 */
function applyHourlyExtras(extras, hours) {
  const hrs = Math.max(0, Number(hours) || 0);
  if (!Array.isArray(extras) || extras.length === 0) {
    return { extras: [], extrasSubtotal: 0 };
  }

  const priced = extras.map((e) => {
    const unit = Math.max(0, Number(e.price) || 0);
    const qty = Math.max(1, Math.floor(Number(e.quantity) || 1));
    const line = Math.round(unit * qty * hrs * 100) / 100;
    const qtyLabel = qty > 1 ? `${qty} × ` : '';
    return {
      image: e.image || '',
      title: e.title,
      price: line,
      quantity: qty,
      description:
        hrs > 0
          ? `${qtyLabel}£${unit.toFixed(2)} per hour × ${hrs}${hrs === 1 ? ' hr' : ' hrs'} booked`
          : e.description || '',
    };
  });

  const extrasSubtotal = priced.reduce((sum, e) => sum + (e.price || 0), 0);
  return { extras: priced, extrasSubtotal: Math.round(extrasSubtotal * 100) / 100 };
}

function computeExtraMicCost(extraMics, pricePerHour, hours) {
  const n = Math.max(0, Number(extraMics) || 0);
  const rate = Math.max(0, Number(pricePerHour) || 0);
  const hrs = Math.max(0, Number(hours) || 0);
  return Math.round(n * rate * hrs * 100) / 100;
}

/**
 * Clamp / validate extra mic count against package included mics + studio capacity.
 */
function resolveExtraMics({ extraMics, includedMics, studioMicCapacity, maxGuests }) {
  const included = Math.max(0, Number(includedMics) || 0);
  const settingsCap = Math.max(1, Number(studioMicCapacity) || 5);
  const guestCap = Math.min(9, Math.max(0, Number(maxGuests) || 0));
  // Align with storefront: allow extras up to package guest ceiling when higher than settings.
  const capacity = Math.max(settingsCap, guestCap || 0);
  const maxExtra = Math.max(0, capacity - included);
  const requested = Math.max(0, Math.floor(Number(extraMics) || 0));
  return Math.min(requested, maxExtra);
}

function buildExtraMicLineItem({ extraMics, pricePerHour, hours }) {
  const n = Math.max(0, Number(extraMics) || 0);
  if (n <= 0) return null;
  const rate = Math.max(0, Number(pricePerHour) || 0);
  const hrs = Math.max(1, Number(hours) || 1);
  const price = computeExtraMicCost(n, rate, hrs);
  return {
    image: '',
    title: n === 1 ? 'Extra microphone' : 'Extra microphones',
    price,
    description: `${n} × £${rate.toFixed(2)} per hour × ${hrs}${hrs === 1 ? ' hr' : ' hrs'}`,
  };
}

/**
 * Resolve an optional editing package add-on (flat per-episode price).
 * Accepts type=editing, or legacy service packages with *-editing slugs.
 */
async function resolveEditingAddOn(editingPackageId) {
  const BookingPackage = require('../models/bookingPackage');
  const mongoose = require('mongoose');

  if (!editingPackageId || !mongoose.Types.ObjectId.isValid(String(editingPackageId))) {
    return { line: null, subtotal: 0 };
  }

  const editPkg = await BookingPackage.findOne({
    _id: editingPackageId,
    isdeleted: false,
    isActive: true,
    $or: [
      { type: 'editing' },
      { slug: /editing/i },
      { name: /editing/i },
    ],
  }).lean();

  if (!editPkg) {
    return { error: 'Invalid or inactive editing package' };
  }

  const price = Math.max(0, Number(editPkg.price) || 0);
  return {
    line: {
      image: editPkg.image ? String(editPkg.image).trim() : '',
      title: String(editPkg.name || '').trim() || 'Editing',
      price,
      description: editPkg.description
        ? String(editPkg.description).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
        : 'Per episode',
    },
    subtotal: price,
  };
}

function computeBookingTotals(packagePrice, slotCount, extrasSubtotal = 0) {
  const price = Math.max(0, Number(packagePrice) || 0);
  const slots = Math.max(1, Number(slotCount) || 1);
  const slotsSubtotal = Math.round(price * slots * 100) / 100;
  const extras = Math.max(0, Number(extrasSubtotal) || 0);
  const totalAmount = Math.round((slotsSubtotal + extras) * 100) / 100;
  return { slotsSubtotal, extrasSubtotal: extras, totalAmount };
}

/** Compare money amounts in major units (e.g. GBP) with 1-cent tolerance. */
function amountsMatch(a, b, tolerance = 0.01) {
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  return Math.abs(left - right) <= tolerance;
}

module.exports = {
  normalizeEmail,
  validateExtrasAgainstPackage,
  applyHourlyExtras,
  computeExtraMicCost,
  resolveExtraMics,
  buildExtraMicLineItem,
  resolveEditingAddOn,
  computeBookingTotals,
  amountsMatch,
};
