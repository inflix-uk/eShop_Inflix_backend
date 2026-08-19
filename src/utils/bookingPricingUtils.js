/**
 * Server-side booking price validation — never trust client amounts or extra prices.
 */

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/** Fixed-price packages charge one flat amount instead of a per-hour rate. */
function isFixedPricePackage(pkg) {
  return String(pkg?.pricingMode || 'hourly') === 'fixed';
}

/**
 * Editing packages currently live as type=service with "editing" in the name/slug.
 * Match both so storefront and server agree without a data migration.
 */
function isEditingPackage(pkg) {
  if (String(pkg?.type || '') === 'editing') return true;
  const slug = String(pkg?.slug || '').toLowerCase();
  const name = String(pkg?.name || '').toLowerCase();
  return slug.includes('editing') || /editing/.test(name);
}

/**
 * Multiplier applied to every per-hour rate (package price, extras, mics).
 * Hourly packages bill one unit per booked hour; fixed packages bill a single unit.
 */
function resolveBillableUnits(pkg, slotCount) {
  const slots = Math.max(0, Math.floor(Number(slotCount) || 0));
  if (slots === 0) return 0;
  return isFixedPricePackage(pkg) ? 1 : slots;
}

/** Hours cap for a package. 0 means unlimited. */
function resolveMaxHours(pkg) {
  return Math.max(0, Math.floor(Number(pkg?.maxHours) || 0));
}

/** Guard a requested hour count against the package's admin-configured cap. */
function validateHoursWithinLimit(pkg, slotCount) {
  const maxHours = resolveMaxHours(pkg);
  const hours = Math.max(0, Math.floor(Number(slotCount) || 0));

  if (maxHours > 0 && hours > maxHours) {
    return {
      valid: false,
      error: `Hours limit exceeded — ${String(pkg?.name || 'this package').trim()} allows a maximum of ${maxHours} hour${
        maxHours === 1 ? '' : 's'
      } per booking. You selected ${hours}.`,
    };
  }

  return { valid: true };
}

/**
 * Effective charge for a catalog extra. When an admin discount is active the
 * discounted amount is billed and the list price becomes the "was" price.
 */
function resolveExtraPricing(extra) {
  const listPrice = Math.max(0, Number(extra?.price) || 0);
  const discountPrice = Math.max(0, Number(extra?.discountPrice) || 0);
  const hasDiscount =
    Boolean(extra?.discountEnabled) && listPrice > 0 && discountPrice < listPrice;

  if (!hasDiscount) {
    return { unitPrice: listPrice, originalPrice: 0, discountPercent: 0, hasDiscount: false };
  }

  return {
    unitPrice: discountPrice,
    originalPrice: listPrice,
    discountPercent: Math.round(((listPrice - discountPrice) / listPrice) * 100),
    hasDiscount: true,
  };
}

/** TBC is unused — extras always have a price. Zero-price extras cannot be added. */
function isExtraPriceTbc(extra) {
  return resolveExtraPricing(extra).unitPrice <= 0;
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

    if (isExtraPriceTbc(catalogEntry)) {
      return { error: `${String(catalogEntry.title).trim()} is priced TBC and cannot be booked yet` };
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

    const pricing = resolveExtraPricing(catalogEntry);

    normalized.push({
      image: catalogEntry.image ? String(catalogEntry.image).trim() : '',
      title: String(catalogEntry.title).trim(),
      /** Catalog unit price after discount. Line total via applyHourlyExtras / applyEditingExtras. */
      price: pricing.unitPrice,
      originalPrice: pricing.originalPrice,
      discountPercent: pricing.discountPercent,
      description: catalogEntry.description ? String(catalogEntry.description).trim() : '',
      quantity,
      quantityEnabled,
      unitLabel: catalogEntry.unitLabel ? String(catalogEntry.unitLabel).trim() : '',
      priceTbc: false,
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
function applyHourlyExtras(extras, hours, options = {}) {
  const hrs = Math.max(0, Number(hours) || 0);
  const fixedPrice = Boolean(options.fixedPrice);
  if (!Array.isArray(extras) || extras.length === 0) {
    return { extras: [], extrasSubtotal: 0 };
  }

  const priced = extras.map((e) => {
    const unit = Math.max(0, Number(e.price) || 0);
    const qty = Math.max(1, Math.floor(Number(e.quantity) || 1));
    const line = Math.round(unit * qty * hrs * 100) / 100;
    const qtyLabel = qty > 1 ? `${qty} × ` : '';
    const discountPercent = Math.max(0, Math.round(Number(e.discountPercent) || 0));
    const originalPrice = Math.max(0, Number(e.originalPrice) || 0);
    const discountLabel =
      discountPercent > 0 && originalPrice > unit
        ? ` · ${discountPercent}% off (was £${originalPrice.toFixed(2)})`
        : '';
    let description = e.description || '';
    if (hrs > 0) {
      description = fixedPrice
        ? `${qtyLabel}£${unit.toFixed(2)} fixed price${discountLabel}`
        : `${qtyLabel}£${unit.toFixed(2)} per hour × ${hrs}${hrs === 1 ? ' hr' : ' hrs'} booked${discountLabel}`;
    }
    return {
      image: e.image || '',
      title: e.title,
      price: line,
      quantity: qty,
      description,
    };
  });

  const extrasSubtotal = priced.reduce((sum, e) => sum + (e.price || 0), 0);
  return { extras: priced, extrasSubtotal: Math.round(extrasSubtotal * 100) / 100 };
}

/**
 * How many times an editing extra is billed.
 * "per order" / "per reel" stay flat; anything else (default: per episode) × episode count.
 */
function resolveEditingExtraUnits(unitLabel, episodeCount, quantity = 1) {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const episodes = Math.max(1, Math.floor(Number(episodeCount) || 1));
  const label = String(unitLabel || 'per episode').toLowerCase();
  if (label.includes('order') || label.includes('reel')) return qty;
  return qty * episodes;
}

/**
 * Convert catalog extras into line totals for an editing (per-episode) booking.
 */
function applyEditingExtras(extras, episodeCount) {
  const episodes = Math.max(1, Math.floor(Number(episodeCount) || 1));
  if (!Array.isArray(extras) || extras.length === 0) {
    return { extras: [], extrasSubtotal: 0 };
  }

  const priced = extras.map((e) => {
    const unit = Math.max(0, Number(e.price) || 0);
    const qty = Math.max(1, Math.floor(Number(e.quantity) || 1));
    const units = resolveEditingExtraUnits(e.unitLabel, episodes, qty);
    const line = Math.round(unit * units * 100) / 100;
    const label = String(e.unitLabel || 'per episode').trim() || 'per episode';
    const qtyLabel = qty > 1 ? `${qty} × ` : '';
    return {
      image: e.image || '',
      title: e.title,
      price: line,
      quantity: qty,
      description: `${qtyLabel}£${unit.toFixed(2)} ${label}`,
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

function buildExtraMicLineItem({ extraMics, pricePerHour, hours, fixedPrice = false }) {
  const n = Math.max(0, Number(extraMics) || 0);
  if (n <= 0) return null;
  const rate = Math.max(0, Number(pricePerHour) || 0);
  const hrs = Math.max(1, Number(hours) || 1);
  const price = computeExtraMicCost(n, rate, hrs);
  return {
    image: '',
    title: n === 1 ? 'Extra microphone' : 'Extra microphones',
    price,
    description: fixedPrice
      ? `${n} × £${rate.toFixed(2)} fixed price`
      : `${n} × £${rate.toFixed(2)} per hour × ${hrs}${hrs === 1 ? ' hr' : ' hrs'}`,
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
  isFixedPricePackage,
  isEditingPackage,
  resolveBillableUnits,
  resolveMaxHours,
  validateHoursWithinLimit,
  resolveExtraPricing,
  isExtraPriceTbc,
  validateExtrasAgainstPackage,
  applyHourlyExtras,
  resolveEditingExtraUnits,
  applyEditingExtras,
  computeExtraMicCost,
  resolveExtraMics,
  buildExtraMicLineItem,
  resolveEditingAddOn,
  computeBookingTotals,
  amountsMatch,
};
