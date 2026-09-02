/**
 * Fire-and-forget server conversions after a paid/Pending order.
 * Never throws into checkout. Missing env / missing consent → skipped.
 */

const Order = require('../../models/order');
const { shouldUploadForOrder } = require('./googleAdsEligibility');
const { buildGa4MpPayload, isGa4Configured } = require('./ga4MeasurementProtocol');

function conversionTrackingEnabled() {
  return process.env.CONVERSION_TRACKING_ENABLED !== 'false';
}

function resolveConsent(order) {
  return {
    analytics:
      order?.conversionConsent?.analytics === true ||
      order?.marketingAttribution?.consent?.analytics === true,
    marketing:
      order?.conversionConsent?.marketing === true ||
      order?.marketingAttribution?.consent?.marketing === true,
  };
}

function alreadyDone(status) {
  return status === 'sent' || status === 'skipped';
}

async function patchTracking(orderId, patch) {
  if (!orderId) return;
  try {
    await Order.updateOne({ _id: orderId }, { $set: patch });
  } catch (err) {
    console.warn('[conversionTracking] failed to persist status:', err?.message || err);
  }
}

async function trackMetaCapi(order, consent) {
  const current = order?.conversionTracking?.meta?.status;
  if (alreadyDone(current)) return;

  if (!consent.marketing) {
    await patchTracking(order._id, {
      'conversionTracking.meta.status': 'skipped',
      'conversionTracking.meta.error': 'no marketing consent',
    });
    return;
  }

  if (!process.env.META_CAPI_ACCESS_TOKEN || !process.env.META_PIXEL_ID) {
    await patchTracking(order._id, {
      'conversionTracking.meta.status': 'skipped',
      'conversionTracking.meta.error': 'not configured',
    });
  }
}

async function trackGa4(order) {
  const current = order?.conversionTracking?.ga4?.status;
  if (alreadyDone(current)) return;

  if (!isGa4Configured()) {
    const payload = buildGa4MpPayload(order);
    await patchTracking(order._id, {
      'conversionTracking.ga4.status': 'skipped',
      'conversionTracking.ga4.mode': payload.mode,
      'conversionTracking.ga4.error': 'not configured',
    });
    return;
  }

  const payload = buildGa4MpPayload(order);
  await patchTracking(order._id, {
    'conversionTracking.ga4.status': 'skipped',
    'conversionTracking.ga4.mode': payload.mode,
    'conversionTracking.ga4.error': 'upload not wired',
  });
}

async function trackGoogleAds(order) {
  const current = order?.conversionTracking?.googleAds?.status;
  if (alreadyDone(current)) return;

  const decision = shouldUploadForOrder(order);
  if (!decision.eligible) {
    await patchTracking(order._id, {
      'conversionTracking.googleAds.status': 'skipped',
      'conversionTracking.googleAds.error': decision.reason,
    });
    return;
  }

  await patchTracking(order._id, {
    'conversionTracking.googleAds.status': 'skipped',
    'conversionTracking.googleAds.uploadMode': decision.uploadMode,
    'conversionTracking.googleAds.error': 'not configured',
  });
}

async function trackOpenAiAds(order, consent) {
  const current = order?.conversionTracking?.openaiAds?.status;
  if (alreadyDone(current)) return;

  if (!consent.marketing) {
    await patchTracking(order._id, {
      'conversionTracking.openaiAds.status': 'skipped',
      'conversionTracking.openaiAds.error': 'no marketing consent',
    });
    return;
  }

  await patchTracking(order._id, {
    'conversionTracking.openaiAds.status': 'skipped',
    'conversionTracking.openaiAds.error': 'not configured',
  });
}

/**
 * @param {object} order
 */
async function trackServerConversions(order) {
  try {
    if (!order || order.status !== 'Pending') return;
    if (!conversionTrackingEnabled()) return;

    const consent = resolveConsent(order);
    const eventId = order.orderNumber;
    await patchTracking(order._id, {
      'conversionTracking.eventId': eventId,
    });

    await Promise.all([
      trackMetaCapi(order, consent),
      trackGa4(order),
      trackGoogleAds(order),
      trackOpenAiAds(order, consent),
    ]);
  } catch (err) {
    console.warn('[conversionTracking] non-fatal:', err?.message || err);
  }
}

function scheduleServerConversions(order) {
  if (!order || order.status !== 'Pending') return;
  setImmediate(() => {
    trackServerConversions(order).catch(() => {
      /* never throw into checkout */
    });
  });
}

module.exports = {
  trackServerConversions,
  scheduleServerConversions,
};
