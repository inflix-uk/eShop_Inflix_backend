const { lineKey } = require('./normalizePricingIds');

/**
 * Overwrite billing fields on cart lines from server-resolved pricing.
 * Display fields (name, images, SKU, etc.) are preserved.
 */
function applyServerPricesToCart(cart, serverLines) {
  const serverByKey = new Map();
  for (const line of serverLines || []) {
    serverByKey.set(lineKey(line.productId, line.variantId), line);
  }

  return (cart || []).map((item) => {
    if (item.isTradeIn || item.productId === 'trade-in') {
      return item;
    }

    const key = lineKey(
      String(item.productId || ''),
      String(item._id || item.variantId || '')
    );
    const server = serverByKey.get(key);
    if (!server) {
      return item;
    }

    const unitPrice = Number(server.unitPrice);
    const qty = Number(item.qty) || Number(server.qty) || 1;
    const lineTotal =
      Number(server.lineTotal) || Math.round(unitPrice * qty * 100) / 100;

    const updated = {
      ...item,
      salePrice: unitPrice,
      Price: unitPrice,
    };

    if (Object.prototype.hasOwnProperty.call(item, 'subtotal')) {
      updated.subtotal = lineTotal;
    }
    if (Object.prototype.hasOwnProperty.call(item, 'total')) {
      updated.total = lineTotal;
    }
    if (Object.prototype.hasOwnProperty.call(item, 'lineTotal')) {
      updated.lineTotal = lineTotal;
    }

    return updated;
  });
}

module.exports = {
  applyServerPricesToCart,
};
