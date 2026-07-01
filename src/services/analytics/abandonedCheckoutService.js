const CheckoutLog = require('../../models/checkoutLog');

const SUCCESS_EVENTS = new Set(['backend.webhook.payment_intent.succeeded']);

const FAILED_EVENTS = new Set(['backend.webhook.payment_intent.failed']);

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function sanitizePi(value) {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

/**
 * Abandoned checkout metrics from CheckoutLog (distinct PaymentIntents in range).
 * A PI is "started" when it has any log row in the selected UK date window.
 * "Completed" / "failed" use backend webhook events when present.
 */
async function getAbandonedCheckoutMetrics(startDate, endDate) {
  const logs = await CheckoutLog.find({
    createdAt: { $gte: startDate, $lte: endDate },
    paymentIntentId: { $exists: true, $nin: [null, ''] },
  })
    .select('paymentIntentId event orderNumber paymentMethodType createdAt')
    .lean();

  const byPi = new Map();

  for (const row of logs) {
    const pi = sanitizePi(row.paymentIntentId);
    if (!pi) continue;

    if (!byPi.has(pi)) {
      byPi.set(pi, {
        hasSuccess: false,
        hasFailed: false,
        orderNumber: null,
        lastEvent: null,
        lastEventAt: null,
      });
    }

    const entry = byPi.get(pi);
    if (SUCCESS_EVENTS.has(row.event)) entry.hasSuccess = true;
    if (FAILED_EVENTS.has(row.event)) entry.hasFailed = true;
    if (row.orderNumber) entry.orderNumber = row.orderNumber;

    const at = row.createdAt ? new Date(row.createdAt) : null;
    if (at && (!entry.lastEventAt || at > entry.lastEventAt)) {
      entry.lastEventAt = at;
      entry.lastEvent = row.event;
    }
  }

  let paymentIntentsInRange = 0;
  let paymentIntentsCompleted = 0;
  let paymentIntentsFailed = 0;
  let paymentIntentsAbandoned = 0;

  for (const entry of byPi.values()) {
    paymentIntentsInRange += 1;
    if (entry.hasSuccess) {
      paymentIntentsCompleted += 1;
    } else if (entry.hasFailed) {
      paymentIntentsFailed += 1;
    } else {
      paymentIntentsAbandoned += 1;
    }
  }

  const abandonmentRate =
    paymentIntentsInRange > 0
      ? round2((paymentIntentsAbandoned / paymentIntentsInRange) * 100)
      : null;

  const completionRate =
    paymentIntentsInRange > 0
      ? round2((paymentIntentsCompleted / paymentIntentsInRange) * 100)
      : null;

  return {
    paymentIntentsInRange,
    paymentIntentsCompleted,
    paymentIntentsFailed,
    paymentIntentsAbandoned,
    abandonmentRate,
    completionRate,
    availability: paymentIntentsInRange > 0 ? 'available' : 'unavailable',
  };
}

module.exports = {
  getAbandonedCheckoutMetrics,
  SUCCESS_EVENTS,
  FAILED_EVENTS,
};
