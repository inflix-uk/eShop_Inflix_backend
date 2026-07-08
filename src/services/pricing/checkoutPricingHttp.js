/**
 * Map pricing resolver errors to checkout HTTP responses.
 * @returns {{ status: number, body: object }|null}
 */
function pricingResultToHttp(pricingResult) {
  if (!pricingResult || pricingResult.ok) {
    return null;
  }

  if (pricingResult.error === 'PRICE_MISMATCH') {
    return {
      status: 409,
      body: {
        success: false,
        code: 'PRICE_MISMATCH',
        message: 'Some prices have changed. Please review your cart.',
        serverLines: pricingResult.serverLines || [],
        mismatches: pricingResult.mismatches || [],
      },
    };
  }

  if (pricingResult.error === 'COUPON_INVALID') {
    return {
      status: 400,
      body: {
        success: false,
        code: 'COUPON_INVALID',
        message: pricingResult.message || 'Invalid coupon.',
      },
    };
  }

  if (pricingResult.error === 'SHIPPING_INVALID') {
    return {
      status: 400,
      body: {
        success: false,
        code: 'SHIPPING_INVALID',
        message: pricingResult.message || 'Invalid shipping method.',
      },
    };
  }

  return {
    status: 400,
    body: {
      success: false,
      code: 'PRICING_UNRESOLVED',
      message: 'One or more items could not be priced. Please refresh your cart and try again.',
    },
  };
}

/** @alias pricingResultToHttp — also handles coupon/shipping checkout totals */
function checkoutTotalToHttp(checkoutTotal) {
  return pricingResultToHttp(checkoutTotal);
}

function logCheckoutPricingBlocked(route, orderNumber, pricingResult) {
  console.warn(
    JSON.stringify({
      event: 'PRICING_CHECKOUT_BLOCKED',
      route,
      orderNumber: orderNumber || null,
      code: pricingResult.error,
      clientSubtotal: pricingResult.clientSubtotal,
      serverSubtotal: pricingResult.serverSubtotal,
      subtotalDelta: pricingResult.subtotalDelta,
      mismatchBlocked: pricingResult.error === 'PRICE_MISMATCH',
    })
  );
}

function logCheckoutPricingSuccess(route, orderNumber, pricingResult) {
  console.log(
    JSON.stringify({
      event: 'PRICING_CHECKOUT',
      route,
      orderNumber: orderNumber || null,
      clientSubtotal: pricingResult.clientSubtotal,
      serverSubtotal: pricingResult.serverSubtotal,
      subtotalDelta: pricingResult.subtotalDelta,
      usedServerAmount: true,
      mismatchBlocked: false,
    })
  );
}

module.exports = {
  pricingResultToHttp,
  checkoutTotalToHttp,
  logCheckoutPricingBlocked,
  logCheckoutPricingSuccess,
};
