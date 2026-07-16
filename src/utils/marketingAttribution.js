const crypto = require('crypto');

const MAX_LEN = {
  source: 120,
  medium: 120,
  campaign: 200,
  content: 200,
  term: 200,
  referrer: 2048,
  referrerDomain: 253,
  landingPage: 2048,
  clickId: 256,
  sessionId: 128,
  visitorId: 128,
  campaignId: 128,
  attributionModel: 64,
  generic: 256,
};

/** URL click IDs — kept even without marketing consent (guide §7.5). */
const URL_CLICK_IDS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid', 'oppref'];
/** Cookie-based Meta IDs — marketing consent required. */
const COOKIE_CLICK_IDS = ['fbc', 'fbp'];
const ALLOWED_CLICK_IDS = [...URL_CLICK_IDS, ...COOKIE_CLICK_IDS];
const CAMPAIGN_ID_KEYS = [
  'googleCampaignId',
  'googleAdGroupId',
  'googleCreativeId',
  'metaCampaignId',
  'metaAdSetId',
  'metaAdId',
];

const PAID_SEARCH_MEDIUMS = new Set(['cpc', 'ppc', 'paid_search']);
const PAID_SOCIAL_SOURCES = new Set(['facebook', 'instagram', 'meta', 'tiktok']);
const PAID_SOCIAL_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paid_social', 'paidsocial']);
const EMAIL_SIGNALS = new Set(['email', 'newsletter']);

function sanitizeString(value, maxLen = MAX_LEN.generic) {
  if (value == null) return undefined;
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return undefined;
  }
  let s = String(value).trim();
  if (!s) return undefined;
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

function normalizeToken(value, maxLen) {
  const s = sanitizeString(value, maxLen);
  if (!s) return undefined;
  return s.toLowerCase();
}

function parseReferrerDomain(referrer) {
  if (!referrer) return undefined;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function parseDate(value) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function normalizeTouch(rawTouch) {
  if (!rawTouch || typeof rawTouch !== 'object' || Array.isArray(rawTouch)) {
    return undefined;
  }

  const touch = {};
  const source = normalizeToken(rawTouch.source, MAX_LEN.source);
  const medium = normalizeToken(rawTouch.medium, MAX_LEN.medium);
  const campaign = sanitizeString(rawTouch.campaign, MAX_LEN.campaign);
  const content = sanitizeString(rawTouch.content, MAX_LEN.content);
  const term = sanitizeString(rawTouch.term, MAX_LEN.term);
  const referrer = sanitizeString(rawTouch.referrer, MAX_LEN.referrer);
  const landingPage = sanitizeString(rawTouch.landingPage, MAX_LEN.landingPage);
  const referrerDomain =
    sanitizeString(rawTouch.referrerDomain, MAX_LEN.referrerDomain) ||
    parseReferrerDomain(referrer);

  if (source) touch.source = source;
  if (medium) touch.medium = medium;
  if (campaign) touch.campaign = campaign;
  if (content) touch.content = content;
  if (term) touch.term = term;
  if (referrer) touch.referrer = referrer;
  if (referrerDomain) touch.referrerDomain = referrerDomain;
  if (landingPage) touch.landingPage = landingPage;

  const capturedAt = parseDate(rawTouch.capturedAt);
  if (capturedAt) touch.capturedAt = capturedAt;

  return Object.keys(touch).length > 0 ? touch : undefined;
}

/**
 * Guide §7.5: always keep URL click IDs; fbc/fbp only when marketing allowed.
 * @param {object} raw
 * @param {{ allowCookieClickIds?: boolean }} options
 */
function normalizeClickIds(raw, options = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }

  const allowCookieClickIds = options.allowCookieClickIds !== false;
  const clickIds = {};

  for (const key of URL_CLICK_IDS) {
    const value = sanitizeString(raw[key], MAX_LEN.clickId);
    if (value) clickIds[key] = value;
  }

  if (allowCookieClickIds) {
    for (const key of COOKIE_CLICK_IDS) {
      const value = sanitizeString(raw[key], MAX_LEN.clickId);
      if (value) clickIds[key] = value;
    }
  }

  return Object.keys(clickIds).length > 0 ? clickIds : undefined;
}

function normalizeCampaignIds(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;

  const campaignIds = {};
  for (const key of CAMPAIGN_ID_KEYS) {
    const value = sanitizeString(raw[key], MAX_LEN.campaignId);
    if (value) campaignIds[key] = value;
  }

  return Object.keys(campaignIds).length > 0 ? campaignIds : undefined;
}

function normalizeConsent(rawConsent) {
  if (!rawConsent || typeof rawConsent !== 'object' || Array.isArray(rawConsent)) {
    return undefined;
  }

  const consent = {};
  if (rawConsent.analytics === true) consent.analytics = true;
  if (rawConsent.analytics === false) consent.analytics = false;
  if (rawConsent.marketing === true) consent.marketing = true;
  if (rawConsent.marketing === false) consent.marketing = false;

  const capturedAt = parseDate(rawConsent.capturedAt);
  if (capturedAt) consent.capturedAt = capturedAt;

  return Object.keys(consent).length > 0 ? consent : undefined;
}

function pickTouchField(touches, field) {
  for (const touch of touches) {
    if (touch && touch[field]) return touch[field];
  }
  return undefined;
}

function touchFallbackOrder(orderTouch, lastTouch, firstTouch) {
  return [orderTouch, lastTouch, firstTouch].filter(Boolean);
}

function applyClickIdSourceDefaults(normalized, clickIds) {
  if (!clickIds || (normalized.source && normalized.medium)) return;

  if (
    !normalized.source &&
    !normalized.medium &&
    (clickIds.gclid || clickIds.gbraid || clickIds.wbraid || clickIds.msclkid)
  ) {
    normalized.source = 'google';
    normalized.medium = 'cpc';
    return;
  }

  if (!normalized.source && clickIds.fbclid) {
    normalized.source = 'facebook';
  }
}

function inferChannel({ firstTouch, lastTouch, orderTouch, clickIds, normalized }) {
  const touches = [orderTouch, lastTouch, firstTouch].filter(Boolean);
  const source =
    normalized?.source || pickTouchField(touches, 'source');
  const medium =
    normalized?.medium || pickTouchField(touches, 'medium');

  if (
    clickIds &&
    (clickIds.gclid || clickIds.gbraid || clickIds.wbraid || clickIds.msclkid)
  ) {
    return 'paid_search';
  }
  if (medium && PAID_SEARCH_MEDIUMS.has(medium)) return 'paid_search';

  if (clickIds && (clickIds.fbclid || clickIds.ttclid)) return 'paid_social';
  if (
    source &&
    PAID_SOCIAL_SOURCES.has(source) &&
    medium &&
    PAID_SOCIAL_MEDIUMS.has(medium)
  ) {
    return 'paid_social';
  }

  if (
    (medium && EMAIL_SIGNALS.has(medium)) ||
    (source && EMAIL_SIGNALS.has(source))
  ) {
    return 'email';
  }

  const hasReferrer = touches.some((t) => t.referrer || t.referrerDomain);
  if (hasReferrer) return 'referral';

  return 'direct';
}

function buildNormalized({ firstTouch, lastTouch, orderTouch, clickIds }) {
  const touches = touchFallbackOrder(orderTouch, lastTouch, firstTouch);

  const normalized = {};
  const source = pickTouchField(touches, 'source');
  const medium = pickTouchField(touches, 'medium');
  const campaign = pickTouchField(touches, 'campaign');

  if (source) normalized.source = source;
  if (medium) normalized.medium = medium;
  if (campaign) normalized.campaign = campaign;

  applyClickIdSourceDefaults(normalized, clickIds);

  const channel = inferChannel({
    firstTouch,
    lastTouch,
    orderTouch,
    clickIds,
    normalized,
  });
  if (channel) normalized.channel = channel;

  if (normalized.source && normalized.medium) {
    normalized.sourceMedium = `${normalized.source}/${normalized.medium}`;
  } else if (normalized.source) {
    normalized.sourceMedium = normalized.source;
  } else if (normalized.medium) {
    normalized.sourceMedium = normalized.medium;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function hasUsefulAttribution({ normalized, clickIds, touches }) {
  const hasUtm =
    Boolean(normalized?.source || normalized?.medium || normalized?.campaign) ||
    touches.some((t) => t.source || t.medium || t.campaign);
  const hasClickId = Boolean(clickIds && Object.keys(clickIds).length > 0);
  const hasSourceMedium = Boolean(normalized?.sourceMedium);
  return hasUtm || hasClickId || hasSourceMedium;
}

function hasReferrerOnly({ normalized, clickIds, touches }) {
  if (clickIds && Object.keys(clickIds).length > 0) return false;
  if (normalized?.source || normalized?.medium || normalized?.campaign) return false;
  if (touches.some((t) => t.source || t.medium || t.campaign)) return false;
  return touches.some((t) => t.referrer || t.referrerDomain);
}

function hasPartialSource({ normalized, clickIds, touches }) {
  if (clickIds && Object.keys(clickIds).length > 0) return false;
  if (normalized?.campaign || touches.some((t) => t.campaign)) return false;
  return Boolean(normalized?.source || touches.some((t) => t.source));
}

function computeAttributionStatus({
  rawPresent,
  marketingConsentDenied,
  normalized,
  clickIds,
  touches,
  safeAttributionPersisted,
}) {
  if (!rawPresent) return 'missing';

  if (marketingConsentDenied && !safeAttributionPersisted) {
    return 'consent_denied';
  }

  if (hasUsefulAttribution({ normalized, clickIds, touches })) {
    return 'available';
  }

  if (hasReferrerOnly({ normalized, clickIds, touches })) {
    return 'partial';
  }

  if (hasPartialSource({ normalized, clickIds, touches })) {
    return 'partial';
  }

  return 'direct';
}

/**
 * Normalize and sanitize marketing attribution from client payload.
 * Never throws — returns a safe object suitable for Order.marketingAttribution.
 * @param {object|undefined|null} raw
 * @returns {object}
 */
function normalizeMarketingAttribution(raw) {
  try {
    const rawPresent =
      raw != null && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0;

    if (!rawPresent) {
      return {
        schemaVersion: 1,
        attributionModel: 'last_non_direct_click',
        attributionStatus: 'missing',
        capturedAt: new Date(),
      };
    }

    const consent = normalizeConsent(raw.consent);
    const marketingConsentDenied = consent?.marketing === false;
    const allowCookieClickIds = consent?.marketing === true;

    const firstTouch = normalizeTouch(raw.firstTouch);
    const lastTouch = normalizeTouch(raw.lastTouch);
    const orderTouch = normalizeTouch(raw.orderTouch);
    const clickIds = normalizeClickIds(raw.clickIds, { allowCookieClickIds });
    const campaignIds = normalizeCampaignIds(raw.campaignIds);
    const touches = [firstTouch, lastTouch, orderTouch].filter(Boolean);

    const normalized = buildNormalized({
      firstTouch,
      lastTouch,
      orderTouch,
      clickIds,
    });

    const safeAttributionPersisted =
      hasUsefulAttribution({ normalized, clickIds: undefined, touches }) ||
      hasReferrerOnly({ normalized, clickIds: undefined, touches }) ||
      hasPartialSource({ normalized, clickIds: undefined, touches });

    const attributionStatus = computeAttributionStatus({
      rawPresent: true,
      marketingConsentDenied,
      normalized,
      clickIds,
      touches,
      safeAttributionPersisted,
    });

    const result = {
      schemaVersion: 1,
      attributionModel:
        sanitizeString(raw.attributionModel, MAX_LEN.attributionModel) ||
        'last_non_direct_click',
      attributionStatus,
      capturedAt: new Date(),
    };

    if (firstTouch) result.firstTouch = firstTouch;
    if (lastTouch) result.lastTouch = lastTouch;
    if (orderTouch) result.orderTouch = orderTouch;
    if (clickIds) result.clickIds = clickIds;
    if (campaignIds) result.campaignIds = campaignIds;
    if (normalized) result.normalized = normalized;
    if (consent) result.consent = consent;

    const sessionId = sanitizeString(raw.sessionId, MAX_LEN.sessionId);
    const visitorId = sanitizeString(raw.visitorId, MAX_LEN.visitorId);
    if (sessionId) result.sessionId = sessionId;
    if (visitorId) result.visitorId = visitorId;

    const analyticsAllowed = consent?.analytics === true;
    if (analyticsAllowed) {
      const gaClientId = sanitizeString(raw.gaClientId, MAX_LEN.visitorId);
      if (gaClientId) result.gaClientId = gaClientId;
    }

    return result;
  } catch (err) {
    if (
      process.env.MARKETING_ATTRIBUTION_DEBUG === 'true' ||
      process.env.NODE_ENV === 'development'
    ) {
      console.error(
        '[orderAttribution] normalize failed — attribution saved as missing:',
        err?.message || err
      );
    }
    return {
      schemaVersion: 1,
      attributionModel: 'last_non_direct_click',
      attributionStatus: 'missing',
      capturedAt: new Date(),
    };
  }
}

/**
 * Build a stable customer key for analytics (never raw email).
 * @param {{ userId?: string, email?: string }} params
 * @returns {string|undefined}
 */
function buildCustomerKey({ userId, email }) {
  try {
    const id = sanitizeString(userId, 64);
    if (id) return `user:${id}`;

    const normalizedEmail = sanitizeString(email, 320)?.toLowerCase();
    const secret = process.env.MARKETING_ATTRIBUTION_HMAC_SECRET;
    if (!normalizedEmail || !secret) return undefined;

    const hash = crypto
      .createHmac('sha256', secret)
      .update(normalizedEmail)
      .digest('hex');

    return `email:${hash}`;
  } catch {
    return undefined;
  }
}

function shouldApplyMarketingAttribution(existingOrder) {
  if (!existingOrder?.marketingAttribution) return true;
  const status = existingOrder.marketingAttribution.attributionStatus;
  return status === 'missing' || status == null;
}

function attributionTraceEnabled() {
  return (
    process.env.MARKETING_ATTRIBUTION_DEBUG === 'true' ||
    process.env.NODE_ENV === 'development'
  );
}

/**
 * Non-fatal attribution issues for dev/staging logs.
 * @param {{ raw?: object, normalized?: object, isCreate?: boolean, skippedUpdate?: boolean }} params
 * @returns {string[]}
 */
function collectMarketingAttributionIssues({
  raw,
  normalized,
  isCreate,
  skippedUpdate,
}) {
  const issues = [];
  const ma = normalized || {};
  const rawPresent =
    raw != null && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0;
  const savedClick = ma.clickIds || {};
  const rawClick = raw?.clickIds || {};
  const norm = ma.normalized || {};
  const consent = ma.consent || raw?.consent || {};

  if (isCreate && !rawPresent) {
    issues.push('No marketingAttribution in order payload — client did not send attribution');
  }

  if (skippedUpdate) {
    issues.push(
      'Attribution update skipped — order already has attribution (status not missing)'
    );
  }

  if (ma.attributionStatus === 'consent_denied') {
    issues.push('marketing consent denied — click IDs and visitor data not stored');
  }

  if (rawClick.gclid && !savedClick.gclid) {
    if (consent.marketing === false) {
      issues.push('gclid removed — marketing consent was false');
    } else {
      issues.push('gclid present in client payload but missing after normalize — check sanitize');
    }
  }

  const paidSearchSignal =
    norm.channel === 'paid_search' ||
    norm.medium === 'cpc' ||
    norm.medium === 'ppc' ||
    norm.medium === 'paid_search';
  if (
    paidSearchSignal &&
    !savedClick.gclid &&
    !savedClick.gbraid &&
    !savedClick.wbraid &&
    !savedClick.msclkid
  ) {
    issues.push(
      'Paid search UTM without click ID — normal for manual UTM links; real Google Ads clicks include gclid'
    );
  }

  if (rawPresent && ma.attributionStatus === 'missing') {
    issues.push('Client sent marketingAttribution but attributionStatus is missing — normalize may have failed');
  }

  return issues;
}

/**
 * Dev/staging trace — filter backend console with `[orderAttribution]`.
 * @param {{ orderNumber?: string, raw?: object, normalized?: object, isCreate?: boolean, skippedUpdate?: boolean }} params
 */
function logMarketingAttributionTrace({
  orderNumber,
  raw,
  normalized,
  isCreate,
  skippedUpdate,
}) {
  if (!attributionTraceEnabled()) return;

  const ma = normalized || {};
  const clickIds = ma.clickIds || {};
  const norm = ma.normalized || {};
  const consent = ma.consent || {};
  const issues = collectMarketingAttributionIssues({
    raw,
    normalized,
    isCreate,
    skippedUpdate,
  });

  console.log('\n[orderAttribution] ─── backend saved ───');
  console.log('[orderAttribution] orderNumber:', orderNumber || '(pending)');
  console.log('[orderAttribution] action:', isCreate ? 'create' : 'update');
  console.log('[orderAttribution] attributionStatus:', ma.attributionStatus ?? 'missing');
  console.log('[orderAttribution] consent:', {
    analytics: consent.analytics ?? null,
    marketing: consent.marketing ?? null,
  });
  console.log('[orderAttribution] Google Ads click IDs (saved):', {
    gclid: clickIds.gclid || null,
    gbraid: clickIds.gbraid || null,
    wbraid: clickIds.wbraid || null,
  });
  console.log('[orderAttribution] normalized:', {
    source: norm.source || null,
    medium: norm.medium || null,
    campaign: norm.campaign || null,
    channel: norm.channel || null,
    sourceMedium: norm.sourceMedium || null,
  });
  console.log('[orderAttribution] visitorId:', ma.visitorId || null);
  console.log('[orderAttribution] sessionId:', ma.sessionId || null);
  if (raw) {
    console.log('[orderAttribution] raw clickIds (client):', raw.clickIds || null);
    console.log('[orderAttribution] raw touch (order):', raw.orderTouch
      ? {
          source: raw.orderTouch.source,
          medium: raw.orderTouch.medium,
          campaign: raw.orderTouch.campaign,
        }
      : null);
  }
  if (issues.length > 0) {
    console.warn('[orderAttribution] issues / notes:');
    for (const issue of issues) {
      console.warn(`  • ${issue}`);
    }
  } else {
    console.log('[orderAttribution] checks: OK — no issues detected');
  }
  console.log('[orderAttribution] ─────────────────────\n');
}

/**
 * Log inbound attribution on POST /create/order (before normalize/save).
 */
function logMarketingAttributionInbound({ orderNumber, raw }) {
  if (!attributionTraceEnabled()) return;
  const clickIds = raw?.clickIds || {};
  console.log('\n[orderAttribution] ─── inbound POST /create/order ───');
  console.log('[orderAttribution] orderNumber:', orderNumber || '(new order)');
  console.log('[orderAttribution] client clickIds:', {
    gclid: clickIds.gclid || null,
    gbraid: clickIds.gbraid || null,
    wbraid: clickIds.wbraid || null,
    fbclid: clickIds.fbclid || null,
  });
  console.log('[orderAttribution] client touch:', raw?.orderTouch
    ? {
        source: raw.orderTouch.source,
        medium: raw.orderTouch.medium,
        campaign: raw.orderTouch.campaign,
      }
    : null);
  console.log('[orderAttribution] client consent:', raw?.consent || null);
  console.log('[orderAttribution] ─────────────────────────────────\n');
}

/**
 * Log when create order has no attribution payload at all.
 */
function logMarketingAttributionMissing({ orderNumber }) {
  if (!attributionTraceEnabled()) return;
  console.warn(
    `\n[orderAttribution] WARNING — order ${orderNumber || '(pending)'} created without marketingAttribution in request body\n`
  );
}

module.exports = {
  normalizeMarketingAttribution,
  buildCustomerKey,
  shouldApplyMarketingAttribution,
  logMarketingAttributionTrace,
  logMarketingAttributionInbound,
  logMarketingAttributionMissing,
  collectMarketingAttributionIssues,
};
