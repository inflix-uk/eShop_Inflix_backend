/**
 * GA4 Measurement Protocol dual mode.
 * analyticsConsent=true → full payload (items, UTMs, event_id).
 * analyticsConsent=false → minimal cookieless ping (currency, transaction_id, value, gclid).
 */

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function resolveAnalyticsConsent(order) {
  if (order?.conversionConsent?.analytics === true) return true;
  if (order?.marketingAttribution?.consent?.analytics === true) return true;
  return false;
}

function mapItems(cart) {
  if (!Array.isArray(cart)) return [];
  return cart
    .filter((item) => item && !item.isTradeIn && item.productId !== 'trade-in')
    .map((item) => ({
      item_id: String(item.productId || item._id || item.SKU || ''),
      item_name: String(item.productName || item.name || ''),
      price: Number(item.salePrice || item.price || 0),
      quantity: Number(item.qty || item.quantity || 1),
    }))
    .filter((item) => item.item_id || item.item_name);
}

function inferredSourceMedium(order) {
  const attr = order?.marketingAttribution || {};
  const touch = attr.orderTouch || attr.lastTouch || attr.firstTouch || {};
  if (touch.source || touch.medium) {
    return {
      source: touch.source,
      medium: touch.medium,
      campaign: touch.campaign,
      term: touch.term,
      content: touch.content,
    };
  }
  const clickIds = attr.clickIds || {};
  if (nonEmpty(clickIds.gclid) || nonEmpty(clickIds.gbraid) || nonEmpty(clickIds.wbraid)) {
    return { source: 'google', medium: 'cpc' };
  }
  if (nonEmpty(clickIds.fbclid)) return { source: 'facebook', medium: 'paid_social' };
  if (nonEmpty(clickIds.ttclid)) return { source: 'tiktok', medium: 'paid_social' };
  if (nonEmpty(clickIds.msclkid)) return { source: 'bing', medium: 'cpc' };
  const referrer = String(touch.referrer || '').toLowerCase();
  if (referrer.includes('google.')) return { source: 'google', medium: 'organic' };
  return {};
}

function resolveClientId(order, analyticsConsent) {
  const attr = order?.marketingAttribution || {};
  if (analyticsConsent && nonEmpty(attr.gaClientId)) return attr.gaClientId;
  if (analyticsConsent && nonEmpty(attr.visitorId)) return attr.visitorId;
  return String(order?.orderNumber || 'unknown');
}

/**
 * @param {object} order
 * @returns {{
 *   mode: 'full' | 'minimal',
 *   client_id: string,
 *   params: object,
 * }}
 */
function buildGa4MpPayload(order) {
  const analyticsConsent = resolveAnalyticsConsent(order);
  const currency = 'GBP';
  const transactionId = String(order?.orderNumber || '');
  const value = Number(order?.totalOrderValue) || 0;
  const gclid = order?.marketingAttribution?.clickIds?.gclid;

  if (analyticsConsent) {
    const inferred = inferredSourceMedium(order);
    const params = {
      currency,
      transaction_id: transactionId,
      value,
      items: mapItems(order?.cart),
      event_id: transactionId,
    };
    if (nonEmpty(gclid)) params.gclid = gclid.trim();
    if (inferred.source) params.source = inferred.source;
    if (inferred.medium) params.medium = inferred.medium;
    if (inferred.campaign) params.campaign = inferred.campaign;
    if (inferred.term) params.term = inferred.term;
    if (inferred.content) params.content = inferred.content;
    return {
      mode: 'full',
      client_id: resolveClientId(order, true),
      params,
    };
  }

  const params = {
    currency,
    transaction_id: transactionId,
    value,
  };
  if (nonEmpty(gclid)) params.gclid = gclid.trim();

  return {
    mode: 'minimal',
    client_id: resolveClientId(order, false),
    params,
  };
}

function isGa4Configured() {
  return Boolean(process.env.GA4_MEASUREMENT_ID && process.env.GA4_API_SECRET);
}

module.exports = {
  buildGa4MpPayload,
  resolveAnalyticsConsent,
  isGa4Configured,
};
