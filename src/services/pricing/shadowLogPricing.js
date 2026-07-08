const { isShadowLogEnabled } = require('../../../config/pricing.config');
const { buildPricingScope } = require('./buildPricingScope');
const { cartProductsToClientLines, toResolveLineInput } = require('./cartLineHelpers');
const { resolveCartPricing } = require('./resolveCartPricing');
const { compareClientCart } = require('./compareClientCart');

/**
 * Phase 0: observe client vs server pricing without changing payment/order amounts.
 * Fire-and-forget — never throws to caller.
 */
async function shadowLogCheckoutPricing({ route, req, cartproducts, orderNumber }) {
  if (!isShadowLogEnabled()) return;
  if (!cartproducts || !Array.isArray(cartproducts) || cartproducts.length === 0) return;

  try {
    const scope = buildPricingScope(req);
    const clientLines = cartProductsToClientLines(cartproducts);
    const resolveInputs = clientLines.map(toResolveLineInput);
    const server = await resolveCartPricing(resolveInputs, scope);
    const diff = compareClientCart(clientLines, server.lines);

    const payload = {
      event: 'PRICING_SHADOW',
      route,
      orderNumber: orderNumber || null,
      userId: scope.userId,
      groupId: scope.groupId,
      clientSubtotal: diff.clientSubtotal,
      serverSubtotal: diff.serverSubtotal,
      subtotalDelta: diff.subtotalDelta,
      matches: diff.matches,
      mismatchCount: diff.mismatches.length,
      mismatches: diff.mismatches.slice(0, 10),
      pricingVersion: server.pricingVersion,
      timestamp: new Date().toISOString(),
    };

    if (!diff.matches) {
      console.warn(JSON.stringify(payload));
    } else {
      console.log(JSON.stringify(payload));
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'PRICING_SHADOW_ERROR',
        route,
        orderNumber: orderNumber || null,
        message: error?.message || String(error),
        timestamp: new Date().toISOString(),
      })
    );
  }
}

module.exports = {
  shadowLogCheckoutPricing,
};
