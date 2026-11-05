/**
 * Courier → tracking URL mapping. Single source of truth for:
 *  - the admin "Shipping Provider" dropdown (served by GET /shipping/couriers)
 *  - the tracking link stored on the order (`shippingDetails.trackingUrl`)
 *  - the tracking button in the shipped / delivered emails
 *
 * `{n}` in `urlTemplate` is replaced with the URL-encoded tracking number.
 * A seller-typed custom URL always wins over the template.
 */

const COURIERS = [
  {
    id: 'royal-mail',
    name: 'Royal Mail',
    aliases: ['royalmail', 'royal mail tracked', 'rm'],
    urlTemplate: 'https://www.royalmail.com/track-your-item#/tracking-results/{n}',
  },
  {
    id: 'dhl',
    name: 'DHL',
    aliases: ['dhl express', 'dhl parcel'],
    urlTemplate:
      'https://www.dhl.com/gb-en/home/tracking/tracking-express.html?submit=1&tracking-id={n}',
  },
  {
    id: 'dpd',
    name: 'DPD',
    aliases: ['dpd uk'],
    urlTemplate: 'https://track.dpd.co.uk/parcels/{n}',
  },
  {
    id: 'dpd-local',
    name: 'DPD Local',
    aliases: ['dpdlocal'],
    urlTemplate: 'https://track.dpdlocal.co.uk/parcels/{n}',
  },
  {
    id: 'ups',
    name: 'UPS',
    aliases: [],
    urlTemplate: 'https://www.ups.com/track?loc=en_GB&tracknum={n}',
  },
  {
    id: 'fedex',
    name: 'FedEx',
    aliases: ['fed ex', 'fedex uk'],
    urlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={n}',
  },
  {
    id: 'evri',
    name: 'Evri',
    aliases: ['hermes', 'evri (hermes)', 'evri/hermes', 'myhermes'],
    urlTemplate: 'https://www.evri.com/track/parcel/{n}/details',
  },
  {
    id: 'parcelforce',
    name: 'Parcelforce',
    aliases: ['parcelforce worldwide', 'parcel force'],
    urlTemplate: 'https://www.parcelforce.com/track-trace?trackNumber={n}',
  },
  {
    id: 'yodel',
    name: 'Yodel',
    aliases: [],
    urlTemplate: 'https://www.yodel.co.uk/tracking/{n}',
  },
];

/** Shown in the dropdown; requires the seller to type a courier name and/or URL. */
const OTHER_COURIER = { id: 'other', name: 'Other', aliases: [], urlTemplate: '' };

function normalizeKey(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Find a courier by id, display name or alias (case / spacing / punctuation insensitive).
 * @param {string} nameOrId
 * @returns {typeof COURIERS[number] | null}
 */
function findCourier(nameOrId) {
  const key = normalizeKey(nameOrId);
  if (!key) return null;
  for (const c of COURIERS) {
    if (normalizeKey(c.id) === key || normalizeKey(c.name) === key) return c;
    if (c.aliases.some((a) => normalizeKey(a) === key)) return c;
  }
  return null;
}

/** Only http(s) URLs are accepted as custom tracking links (no javascript: etc). */
function sanitizeCustomTrackingUrl(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.toString();
  } catch {
    return '';
  }
}

/**
 * @param {string} provider courier name / id as stored on the order
 * @param {string} trackingNumber
 * @param {string} [customUrl] seller-typed URL — wins when valid
 * @returns {string} tracking URL or '' when none can be built
 */
function buildTrackingUrl(provider, trackingNumber, customUrl) {
  const custom = sanitizeCustomTrackingUrl(customUrl);
  if (custom) return custom;
  const tn = String(trackingNumber == null ? '' : trackingNumber).trim();
  if (!tn) return '';
  const courier = findCourier(provider);
  if (!courier || !courier.urlTemplate) return '';
  return courier.urlTemplate.split('{n}').join(encodeURIComponent(tn));
}

/**
 * Normalise a shipping update coming from admin before saving it.
 * - Canonicalises the courier name ("dhl" → "DHL", "Hermes" → "Evri").
 * - "Other" + custom courier name → stores the custom name.
 * - Keeps a seller-typed custom URL (`trackingUrlCustom: true`), otherwise builds one from the map.
 *
 * @param {{ provider?: string, customProvider?: string, trackingNumber?: string, trackingUrl?: string, trackingUrlCustom?: boolean }} input
 * @param {{ provider?: string, trackingNumber?: string, trackingUrl?: string, trackingUrlCustom?: boolean }} [existing]
 *   current values on the order — used when the update only sends some of the fields
 */
function normalizeShippingTracking(input = {}, existing = {}) {
  const has = (k) => Object.prototype.hasOwnProperty.call(input, k) && input[k] !== undefined;

  let provider = has('provider') ? String(input.provider || '').trim() : String(existing.provider || '').trim();
  const customProvider = has('customProvider') ? String(input.customProvider || '').trim() : '';
  if (normalizeKey(provider) === 'other' && customProvider) provider = customProvider;
  const courier = findCourier(provider);
  if (courier) provider = courier.name;

  const trackingNumber = has('trackingNumber')
    ? String(input.trackingNumber || '').trim()
    : String(existing.trackingNumber || '').trim();

  // Custom URL: explicit in the input, or previously saved as custom and not cleared.
  let customUrl = '';
  if (has('trackingUrl')) {
    const typed = sanitizeCustomTrackingUrl(input.trackingUrl);
    const autoForInput = buildTrackingUrl(provider, trackingNumber, '');
    // Not custom: exactly what the map builds, or the previously auto-built URL echoed back
    // unchanged by a full-order save (e.g. courier changed DHL → UPS but the old DHL URL came along).
    const staleAuto =
      !existing.trackingUrlCustom && typed && typed === sanitizeCustomTrackingUrl(existing.trackingUrl);
    if (typed && typed !== autoForInput && !staleAuto) customUrl = typed;
  } else if (existing.trackingUrlCustom && existing.trackingUrl) {
    customUrl = sanitizeCustomTrackingUrl(existing.trackingUrl);
  }

  const trackingUrl = buildTrackingUrl(provider, trackingNumber, customUrl);
  return {
    provider,
    trackingNumber,
    trackingUrl,
    trackingUrlCustom: Boolean(customUrl),
  };
}

/**
 * Tracking URL for an order — stored URL first (keeps custom ones), else rebuilt from the map
 * (covers orders shipped before URLs were stored).
 */
function trackingUrlForOrder(order) {
  const sd = (order && order.shippingDetails) || {};
  const stored = sanitizeCustomTrackingUrl(sd.trackingUrl);
  if (stored) return stored;
  return buildTrackingUrl(sd.provider, sd.trackingNumber, '');
}

/** Public list for dropdowns. */
function listCouriers({ includeOther = true } = {}) {
  const list = COURIERS.map((c) => ({
    id: c.id,
    name: c.name,
    urlTemplate: c.urlTemplate,
  }));
  if (includeOther) list.push({ id: OTHER_COURIER.id, name: OTHER_COURIER.name, urlTemplate: '' });
  return list;
}

module.exports = {
  COURIERS,
  findCourier,
  buildTrackingUrl,
  sanitizeCustomTrackingUrl,
  normalizeShippingTracking,
  trackingUrlForOrder,
  listCouriers,
};
