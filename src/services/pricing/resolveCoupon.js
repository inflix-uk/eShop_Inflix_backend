const Coupon = require('../../models/coupon');
const Order = require('../../models/order');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractCouponCode(couponInput) {
  if (!couponInput) return null;
  if (typeof couponInput === 'string') {
    const trimmed = couponInput.trim();
    return trimmed || null;
  }
  const code = String(couponInput.code || '').trim();
  return code || null;
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function calculateDiscountAmount(productSubtotal, coupon) {
  if (!coupon) return 0;
  const subtotal = Number(productSubtotal) || 0;
  if (coupon.discount_type === 'flat') {
    return roundMoney(Math.min(subtotal, Number(coupon.discount) || 0));
  }
  if (coupon.discount_type === 'percentage') {
    const pct = (subtotal * (Number(coupon.discount) || 0)) / 100;
    const capped = coupon.upto ? Math.min(pct, Number(coupon.upto)) : pct;
    return roundMoney(capped);
  }
  return 0;
}

function couponSnapshot(coupon) {
  return {
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount: coupon.discount,
    upto: coupon.upto ?? null,
    minOrderValue: coupon.minOrderValue ?? 0,
    allowMultiple: Boolean(coupon.allowMultiple),
  };
}

async function hasUserUsedCoupon(userId, couponCode) {
  if (!userId || !couponCode) return false;
  const order = await Order.findOne({
    'contactDetails.userId': userId,
    'coupon.code': couponCode,
    status: { $ne: 'Failed' },
  });
  return Boolean(order);
}

/**
 * Server-side coupon validation — never trusts discount fields from the client body.
 */
async function resolveCoupon({ couponInput, userId, productSubtotal }) {
  const code = extractCouponCode(couponInput);
  if (!code) {
    return { ok: true, discountAmount: 0, coupon: null };
  }

  const coupon = await Coupon.findOne({
    code: new RegExp(`^${escapeRegex(code)}$`, 'i'),
  });

  if (!coupon) {
    return { ok: false, error: 'COUPON_INVALID', message: 'Invalid coupon code.' };
  }

  if (coupon.status === 0 || coupon.status === false) {
    return { ok: false, error: 'COUPON_INVALID', message: 'This coupon is not active.' };
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    return { ok: false, error: 'COUPON_INVALID', message: 'This coupon has expired.' };
  }

  const subtotal = Number(productSubtotal) || 0;
  const minOrder = Number(coupon.minOrderValue) || 0;
  if (minOrder > 0 && subtotal < minOrder) {
    return {
      ok: false,
      error: 'COUPON_INVALID',
      message: `This coupon requires a minimum order of £${minOrder}.`,
    };
  }

  const usageLimit = Number(coupon.usage);
  const usedCount = Number(coupon.used) || 0;
  if (Number.isFinite(usageLimit) && usageLimit > 0 && usedCount >= usageLimit) {
    return { ok: false, error: 'COUPON_INVALID', message: 'This coupon has reached its usage limit.' };
  }

  if (userId && !coupon.allowMultiple) {
    const usedByHistory = (coupon.usageHistory || []).some(
      (entry) => String(entry.userId) === String(userId)
    );
    const usedByOrders = await hasUserUsedCoupon(userId, coupon.code);
    if (usedByHistory || usedByOrders) {
      return { ok: false, error: 'COUPON_INVALID', message: 'You have already used this coupon.' };
    }
  }

  const discountAmount = calculateDiscountAmount(subtotal, coupon);

  return {
    ok: true,
    discountAmount,
    coupon: couponSnapshot(coupon),
  };
}

module.exports = {
  resolveCoupon,
  extractCouponCode,
  calculateDiscountAmount,
  couponSnapshot,
  hasUserUsedCoupon,
};
