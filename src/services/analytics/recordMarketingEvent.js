const MarketingEvent = require('../../models/marketingEvent');
const { hashNormalizedEmail, hashNormalizedPhone } = require('../../utils/hashPii');

const ALLOWED_EVENTS = new Set(['page_view', 'add_to_cart', 'begin_checkout', 'purchase']);

function sanitizeString(value, maxLen = 256) {
  if (value == null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function sanitizeDeviceType(value) {
  const device = String(value || '').trim().toLowerCase();
  if (['mobile', 'desktop', 'tablet'].includes(device)) return device;
  return 'unknown';
}

function parseDate(value) {
  if (!value) return new Date();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, 50)
    .map((item) => ({
      productId: sanitizeString(item?.productId || item?.item_id, 128),
      name: sanitizeString(item?.name || item?.item_name || item?.productName, 256),
      price: Number.isFinite(Number(item?.price)) ? Number(item.price) : null,
      quantity: Number.isFinite(Number(item?.quantity ?? item?.qty))
        ? Number(item.quantity ?? item.qty)
        : null,
    }))
    .filter((item) => item.productId || item.name);
}

function resolveUserDataHashes(payload = {}) {
  const existing = payload.userData || {};
  const emailSha256 =
    sanitizeString(existing.emailSha256, 128) ||
    hashNormalizedEmail(payload.email) ||
    undefined;
  const phoneSha256 =
    sanitizeString(existing.phoneSha256, 128) ||
    hashNormalizedPhone(payload.phone) ||
    undefined;

  if (!emailSha256 && !phoneSha256) return undefined;
  return {
    emailSha256: emailSha256 || null,
    phoneSha256: phoneSha256 || null,
  };
}

/**
 * Persist a first-party marketing funnel event. Never stores raw email/phone.
 */
async function recordMarketingEvent(payload = {}) {
  const eventName = sanitizeString(payload.eventName, 64);
  if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
    return { ok: false, reason: 'invalid_event_name' };
  }

  const eventId = sanitizeString(payload.eventId, 128);
  if (!eventId) {
    return { ok: false, reason: 'missing_event_id' };
  }

  const clickIdsRaw = payload.clickIds && typeof payload.clickIds === 'object' ? payload.clickIds : {};
  const clickIds = {};
  for (const key of ['gclid', 'fbclid', 'msclkid', 'ttclid']) {
    const value = sanitizeString(clickIdsRaw[key], 256);
    if (value) clickIds[key] = value;
  }

  const doc = {
    eventName,
    eventId,
    sessionId: sanitizeString(payload.sessionId, 128),
    visitorId: sanitizeString(payload.visitorId, 128),
    occurredAt: parseDate(payload.occurredAt),
    path: sanitizeString(payload.path, 2048),
    pageTitle: sanitizeString(payload.pageTitle, 512),
    platform: sanitizeString(payload.platform, 64),
    source: sanitizeString(payload.source, 128),
    medium: sanitizeString(payload.medium, 128),
    campaign: sanitizeString(payload.campaign, 200),
    channel: sanitizeString(payload.channel, 64),
    value: Number.isFinite(Number(payload.value)) ? Number(payload.value) : null,
    currency: sanitizeString(payload.currency, 8) || 'GBP',
    orderNumber: sanitizeString(payload.orderNumber, 64),
    deviceType: sanitizeDeviceType(payload.deviceType),
    items: normalizeItems(payload.items),
    userData: resolveUserDataHashes(payload),
    clickIds: Object.keys(clickIds).length > 0 ? clickIds : undefined,
  };

  try {
    await MarketingEvent.findOneAndUpdate(
      { eventId },
      { $setOnInsert: doc },
      { upsert: true, new: true }
    );
    return { ok: true };
  } catch (error) {
    if (error?.code === 11000) {
      return { ok: true, duplicate: true };
    }
    throw error;
  }
}

async function getMarketingFunnelCounts(startDate, endDate) {
  const rows = await MarketingEvent.aggregate([
    {
      $match: {
        occurredAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$eventName',
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = {
    page_view: 0,
    add_to_cart: 0,
    begin_checkout: 0,
    purchase: 0,
  };

  for (const row of rows) {
    if (row._id && Object.prototype.hasOwnProperty.call(counts, row._id)) {
      counts[row._id] = row.count;
    }
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return {
    counts,
    total,
    availability: total > 0 ? 'available' : 'unavailable',
  };
}

module.exports = {
  recordMarketingEvent,
  getMarketingFunnelCounts,
  ALLOWED_EVENTS,
};
