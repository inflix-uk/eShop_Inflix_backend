const Order = require('../../models/order');
const { resolveAnalyticsDateRange } = require('../../utils/analyticsDateRange');
const {
  resolvePlatformInJs,
  resolveCampaignInJs,
  pickTouchFieldJs,
} = require('./attributionPlatform');
const { buildAdPerformanceOrderMatch } = require('./adPerformanceReport');

function round2(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function consentLabel(consent) {
  const analytics = Boolean(consent?.analytics);
  const marketing = Boolean(consent?.marketing);
  if (analytics && marketing) return 'Analytics + Marketing';
  if (analytics) return 'Analytics only';
  if (marketing) return 'Marketing only';
  return 'Rejected';
}

function customerDisplay(order) {
  const contact = order.contactDetails || {};
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (contact.name) return String(contact.name);
  if (contact.email) return String(contact.email);
  return null;
}

/**
 * Consent-safe attribution view (guide §3.5):
 * - analytics+marketing both false → strip UTM + click IDs in display
 * - marketing false → keep UTM but hide click IDs
 */
function buildConsentSafeAttribution(attr, consent) {
  const analytics = Boolean(consent?.analytics);
  const marketing = Boolean(consent?.marketing);
  const safe = {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    gclid: null,
    fbclid: null,
    ttclid: null,
    msclkid: null,
    firstTouchTimestamp: null,
    lastTouchTimestamp: null,
    firstVisitAt: null,
    lastVisitAt: null,
  };

  if (!attr || typeof attr !== 'object') return safe;

  const firstTouchAt =
    attr.firstTouch?.capturedAt || attr.capturedAt || null;
  const lastTouchAt =
    attr.lastTouch?.capturedAt ||
    attr.orderTouch?.capturedAt ||
    attr.capturedAt ||
    null;

  safe.firstTouchTimestamp = firstTouchAt;
  safe.lastTouchTimestamp = lastTouchAt;
  safe.firstVisitAt = firstTouchAt;
  safe.lastVisitAt = lastTouchAt;

  // Both denied → strip UTM + click IDs
  if (!analytics && !marketing) {
    return safe;
  }

  // Keep UTM when analytics or marketing granted
  safe.utmSource = pickTouchFieldJs(attr, 'source') || null;
  safe.utmMedium = pickTouchFieldJs(attr, 'medium') || null;
  safe.utmCampaign = pickTouchFieldJs(attr, 'campaign') || null;
  safe.utmTerm = pickTouchFieldJs(attr, 'term') || null;
  safe.utmContent = pickTouchFieldJs(attr, 'content') || null;

  // Guide §7.5: URL click IDs persist without marketing; show if present on order.
  const clickIds = attr.clickIds || {};
  safe.gclid = clickIds.gclid || null;
  safe.fbclid = clickIds.fbclid || null;
  safe.ttclid = clickIds.ttclid || null;
  safe.msclkid = clickIds.msclkid || null;

  return safe;
}

/**
 * @param {{ from?: string, to?: string, startDate?: string, endDate?: string, source?: string, campaign?: string }} query
 */
async function getAdPerformanceOrders(query = {}) {
  const range = resolveAnalyticsDateRange({
    startDate: query.from || query.startDate,
    endDate: query.to || query.endDate,
  });

  const sourceFilter = String(query.source || '').trim();
  const campaignFilter = String(query.campaign || '').trim() || '(unassigned)';

  if (!sourceFilter) {
    return {
      success: false,
      message: 'source is required',
      status: 400,
    };
  }

  const orderMatch = buildAdPerformanceOrderMatch(range.startDate, range.endDate);
  const candidates = await Order.find(orderMatch)
    .select(
      [
        'orderNumber',
        'totalOrderValue',
        'createdAt',
        'status',
        'contactDetails',
        'marketingAttribution',
      ].join(' ')
    )
    .sort({ createdAt: -1 })
    .lean();

  const matched = candidates.filter((order) => {
    const platform = resolvePlatformInJs(order);
    const campaign = resolveCampaignInJs(order);
    return platform === sourceFilter && campaign === campaignFilter;
  });

  let revenue = 0;
  const orders = matched.map((order) => {
    const attr = order.marketingAttribution || {};
    const consent = attr.consent || { analytics: false, marketing: false };
    const total = round2(order.totalOrderValue || 0);
    revenue = round2(revenue + total);

    const safeAttr = buildConsentSafeAttribution(attr, consent);

    return {
      _id: order._id,
      orderNumber: order.orderNumber || String(order._id),
      customerName: customerDisplay(order),
      customerEmail: order.contactDetails?.email || null,
      createdAt: order.createdAt,
      total,
      status: order.status,
      source: sourceFilter,
      campaign: campaignFilter,
      conversionConsent: {
        analytics: Boolean(consent.analytics),
        marketing: Boolean(consent.marketing),
      },
      consent: {
        analytics: Boolean(consent.analytics),
        marketing: Boolean(consent.marketing),
        label: consentLabel(consent),
      },
      marketingAttribution: safeAttr,
      attribution: safeAttr,
    };
  });

  return {
    success: true,
    summary: {
      orderCount: orders.length,
      revenue,
    },
    orders,
    filter: {
      source: sourceFilter,
      campaign: campaignFilter,
      from: range.queryStartDate,
      to: range.queryEndDate,
    },
  };
}

module.exports = {
  getAdPerformanceOrders,
  buildConsentSafeAttribution,
  consentLabel,
};
