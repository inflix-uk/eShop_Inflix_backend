const { buildPricingScope } = require('./buildPricingScope');
const { resolveCheckoutProductSubtotal } = require('./resolvePaymentIntentProductSubtotal');
const { resolveCoupon } = require('./resolveCoupon');
const { resolveShipping } = require('./resolveShipping');

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * Server-authoritative checkout total for payment verification and Stripe amounts.
 */
async function computeCheckoutTotal({
  req,
  cartItems,
  couponInput,
  shippingMethodInput,
  enforceClientPriceMatch = true,
}) {
  const pricingResult = await resolveCheckoutProductSubtotal({
    req,
    cartItems,
    enforceClientPriceMatch,
  });

  if (!pricingResult.ok) {
    return pricingResult;
  }

  const scope = buildPricingScope(req);
  const productSubtotal = pricingResult.totalSalePrice;

  const couponResult = await resolveCoupon({
    couponInput,
    userId: scope.userId,
    productSubtotal,
  });

  if (!couponResult.ok) {
    return couponResult;
  }

  const shippingResult = await resolveShipping({
    shippingMethodInput,
    productSubtotal,
  });

  if (!shippingResult.ok) {
    return shippingResult;
  }

  const totalDiscount = couponResult.discountAmount || 0;
  const adjustedProductTotal = roundMoney(Math.max(0, productSubtotal - totalDiscount));
  const shippingCost = shippingResult.shippingCost || 0;
  const finalTotal = roundMoney(adjustedProductTotal + shippingCost);
  const totalAmountPence = Math.round(finalTotal * 100);

  return {
    ok: true,
    productSubtotal,
    totalDiscount,
    adjustedProductTotal,
    shippingCost,
    finalTotal,
    totalAmountPence,
    coupon: couponResult.coupon,
    shippingMethod: shippingResult.shippingMethod,
    pricingResult,
    couponResult,
    shippingResult,
  };
}

module.exports = {
  computeCheckoutTotal,
};
