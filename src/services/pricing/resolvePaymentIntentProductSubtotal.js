const { buildPricingScope } = require('./buildPricingScope');
const {
  cartProductsToClientLines,
  toResolveLineInput,
} = require('./cartLineHelpers');
const {
  compareClientCart,
} = require('./compareClientCart');
const { resolveCartPricing } = require('./resolveCartPricing');

function formatServerLinesForClient(lines) {
  return (lines || [])
    .filter((l) => !l.isTradeIn && l.productId !== 'trade-in')
    .map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      qty: l.qty,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      priceSource: l.priceSource,
    }));
}

function findUnresolvedChargeableLines(serverLines) {
  return (serverLines || []).filter(
    (l) =>
      !l.isTradeIn &&
      l.productId !== 'trade-in' &&
      (l.found === false || !(Number(l.unitPrice) > 0))
  );
}

/**
 * Server-authoritative checkout pricing decision (testable without MongoDB).
 * Client salePrice is compared only; billing always uses server subtotal.
 */
function decideCheckoutProductSubtotal({ clientLines, serverLines }) {
  const diff = compareClientCart(clientLines, serverLines);
  const unresolved = findUnresolvedChargeableLines(serverLines);

  if (unresolved.length > 0) {
    return {
      ok: false,
      error: 'PRICING_UNRESOLVED',
      clientSubtotal: diff.clientSubtotal,
      serverSubtotal: diff.serverSubtotal,
      subtotalDelta: diff.subtotalDelta,
    };
  }

  if (!diff.matches) {
    return {
      ok: false,
      error: 'PRICE_MISMATCH',
      clientSubtotal: diff.clientSubtotal,
      serverSubtotal: diff.serverSubtotal,
      subtotalDelta: diff.subtotalDelta,
      mismatches: diff.mismatches,
      serverLines: formatServerLinesForClient(serverLines),
    };
  }

  return {
    ok: true,
    totalSalePrice: diff.serverSubtotal,
    clientSubtotal: diff.clientSubtotal,
    serverSubtotal: diff.serverSubtotal,
    subtotalDelta: diff.subtotalDelta,
    resolvedServerLines: serverLines,
  };
}

/** @deprecated alias */
const decidePaymentIntentProductSubtotal = decideCheckoutProductSubtotal;

/**
 * Resolve product subtotal from DB pricing. Always enforces server amounts + mismatch block.
 */
async function resolveCheckoutProductSubtotal({ req, cartItems }) {
  const clientLines = cartProductsToClientLines(cartItems);
  const scope = buildPricingScope(req);
  const server = await resolveCartPricing(
    clientLines.map(toResolveLineInput),
    scope
  );

  return decideCheckoutProductSubtotal({
    clientLines,
    serverLines: server.lines,
  });
}

async function resolvePaymentIntentProductSubtotal({ req, cartproducts }) {
  return resolveCheckoutProductSubtotal({ req, cartItems: cartproducts });
}

module.exports = {
  decideCheckoutProductSubtotal,
  decidePaymentIntentProductSubtotal,
  resolveCheckoutProductSubtotal,
  resolvePaymentIntentProductSubtotal,
  formatServerLinesForClient,
  findUnresolvedChargeableLines,
};
