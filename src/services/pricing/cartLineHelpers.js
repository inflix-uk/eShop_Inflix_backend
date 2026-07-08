/**
 * Map storefront cart / cartproducts payloads to pricing line inputs.
 */
function cartProductsToClientLines(cartproducts) {
  return (cartproducts || []).map((item) => ({
    productId: String(item.productId || ''),
    variantId: String(item._id || item.variantId || ''),
    qty: Number(item.qty) || 1,
    salePrice: Number(item.salePrice ?? item.Price) || 0,
    isTradeIn: Boolean(item.isTradeIn || item.productId === 'trade-in'),
  }));
}

function toResolveLineInput(clientLine) {
  return {
    productId: clientLine.productId,
    variantId: clientLine.variantId,
    qty: clientLine.qty,
    isTradeIn: clientLine.isTradeIn,
  };
}

module.exports = {
  cartProductsToClientLines,
  toResolveLineInput,
};
