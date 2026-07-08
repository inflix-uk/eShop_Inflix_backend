const { lineKey } = require('./normalizePricingIds');
const { MISMATCH_TOLERANCE_PENCE } = require('../../../config/pricing.config');

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function clientSubtotalFromLines(lines) {
  return roundMoney(
    (lines || [])
      .filter((l) => !l.isTradeIn && l.productId !== 'trade-in')
      .reduce((sum, line) => {
        const qty = Number(line.qty) || 0;
        const price = Number(line.salePrice ?? line.unitPrice) || 0;
        return sum + price * qty;
      }, 0)
  );
}

function serverSubtotalFromLines(lines) {
  return roundMoney(
    (lines || [])
      .filter((l) => !l.isTradeIn && l.productId !== 'trade-in' && l.found !== false)
      .reduce((sum, line) => sum + (Number(line.lineTotal) || 0), 0)
  );
}

/**
 * @param {Array<{ productId: string, variantId: string, qty?: number, salePrice?: number }>} clientLines
 * @param {Array<{ productId: string, variantId: string, qty?: number, unitPrice: number, lineTotal?: number }>} serverLines
 * @param {{ tolerancePence?: number }} [opts]
 */
function compareClientCart(clientLines, serverLines, opts = {}) {
  const tolerancePence = opts.tolerancePence ?? MISMATCH_TOLERANCE_PENCE;
  const toleranceMoney = tolerancePence / 100;

  const serverByKey = new Map();
  for (const line of serverLines || []) {
    serverByKey.set(lineKey(line.productId, line.variantId), line);
  }

  const mismatches = [];
  for (const client of clientLines || []) {
    if (client.isTradeIn || client.productId === 'trade-in') continue;

    const key = lineKey(client.productId, client.variantId);
    const server = serverByKey.get(key);
    const clientUnit = Number(client.salePrice);
    const serverUnit = server ? Number(server.unitPrice) : NaN;

    if (!server || server.found === false) {
      mismatches.push({
        productId: client.productId,
        variantId: client.variantId,
        clientUnitPrice: clientUnit,
        serverUnitPrice: null,
        delta: null,
        reason: 'LINE_NOT_RESOLVED',
      });
      continue;
    }

    const delta = roundMoney(clientUnit - serverUnit);
    if (!Number.isFinite(clientUnit) || Math.abs(delta) > toleranceMoney) {
      mismatches.push({
        productId: client.productId,
        variantId: client.variantId,
        clientUnitPrice: clientUnit,
        serverUnitPrice: serverUnit,
        delta,
        reason: 'UNIT_PRICE_MISMATCH',
      });
    }
  }

  const clientSubtotal = clientSubtotalFromLines(clientLines);
  const serverSubtotal = serverSubtotalFromLines(serverLines);
  const subtotalDelta = roundMoney(clientSubtotal - serverSubtotal);
  const matches =
    mismatches.length === 0 && Math.abs(subtotalDelta) <= toleranceMoney;

  return {
    matches,
    mismatches,
    clientSubtotal,
    serverSubtotal,
    subtotalDelta,
  };
}

module.exports = {
  compareClientCart,
  clientSubtotalFromLines,
  serverSubtotalFromLines,
};
