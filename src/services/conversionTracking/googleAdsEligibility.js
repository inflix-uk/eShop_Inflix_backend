/**
 * Click IDs from ad URLs are eligible without cookie consent (gclid_only path).
 * Enhanced conversions (hashed PII) require marketing cookie consent.
 * Google still receives consent.adUserData=DENIED on the gclid_only path.
 */

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function readClickIds(order) {
  return order?.marketingAttribution?.clickIds || {};
}

function resolveMarketingConsent(order) {
  if (order?.conversionConsent?.marketing === true) return true;
  if (order?.marketingAttribution?.consent?.marketing === true) return true;
  return false;
}

function hasGoogleClickId(order) {
  const clickIds = readClickIds(order);
  return nonEmpty(clickIds.gclid) || nonEmpty(clickIds.gbraid) || nonEmpty(clickIds.wbraid);
}

function hasUserProvidedData(order) {
  const contact = order?.contactDetails || {};
  const shipping = order?.shippingDetails || {};
  const email = contact.email || contact.Email;
  const phone = contact.phone || contact.phoneNumber || shipping.phoneNumber;
  const emailOk = nonEmpty(email) && String(email).includes('@');
  const digits = String(phone || '').replace(/\D/g, '');
  return Boolean(emailOk || digits.length >= 8);
}

/**
 * @param {object} order
 * @returns {{
 *   eligible: boolean,
 *   reason?: string,
 *   uploadMode?: 'gclid_only' | 'gclid_and_enhanced' | 'enhanced_only',
 *   adUserData: 'GRANTED' | 'DENIED',
 * }}
 */
function shouldUploadForOrder(order) {
  const already = order?.conversionTracking?.googleAds?.status;
  if (already === 'sent') {
    return {
      eligible: false,
      reason: 'Already sent',
      adUserData: resolveMarketingConsent(order) ? 'GRANTED' : 'DENIED',
    };
  }

  const hasClickId = hasGoogleClickId(order);
  const userProvided = hasUserProvidedData(order);
  const marketing = resolveMarketingConsent(order);
  const adUserData = marketing ? 'GRANTED' : 'DENIED';

  if (!hasClickId && !userProvided) {
    return { eligible: false, reason: 'No gclid or user-provided data', adUserData };
  }

  if (hasClickId) {
    const uploadMode =
      marketing && userProvided ? 'gclid_and_enhanced' : 'gclid_only';
    return { eligible: true, uploadMode, adUserData };
  }

  if (userProvided && marketing) {
    return { eligible: true, uploadMode: 'enhanced_only', adUserData };
  }

  return {
    eligible: false,
    reason: 'No consent for Google Ads conversion upload',
    adUserData,
  };
}

function pickClickIdField(order) {
  const clickIds = readClickIds(order);
  if (nonEmpty(clickIds.gclid)) return { gclid: clickIds.gclid.trim() };
  if (nonEmpty(clickIds.gbraid)) return { gbraid: clickIds.gbraid.trim() };
  if (nonEmpty(clickIds.wbraid)) return { wbraid: clickIds.wbraid.trim() };
  return {};
}

/**
 * Payload fields for ConversionUploadService (no addressInfo).
 * userIdentifiers only when marketing is true.
 */
function buildGoogleAdsUploadFields(order, hashedIdentifiers = {}) {
  const decision = shouldUploadForOrder(order);
  const conversionDateTime = order?.createdAt
    ? new Date(order.createdAt).toISOString()
    : new Date().toISOString();

  const payload = {
    conversionDateTime,
    conversionValue: Number(order?.totalOrderValue) || 0,
    currencyCode: 'GBP',
    orderId: order?.orderNumber,
    consent: { adUserData: decision.adUserData },
    ...pickClickIdField(order),
  };

  if (decision.uploadMode === 'gclid_and_enhanced' || decision.uploadMode === 'enhanced_only') {
    const identifiers = [];
    if (hashedIdentifiers.hashedEmail) {
      identifiers.push({
        hashedEmail: hashedIdentifiers.hashedEmail,
        userIdentifierSource: 'FIRST_PARTY',
      });
    }
    if (hashedIdentifiers.hashedPhoneNumber) {
      identifiers.push({
        hashedPhoneNumber: hashedIdentifiers.hashedPhoneNumber,
        userIdentifierSource: 'FIRST_PARTY',
      });
    }
    if (identifiers.length) payload.userIdentifiers = identifiers;
  }

  return { decision, payload };
}

module.exports = {
  shouldUploadForOrder,
  buildGoogleAdsUploadFields,
  hasGoogleClickId,
  hasUserProvidedData,
  resolveMarketingConsent,
};
