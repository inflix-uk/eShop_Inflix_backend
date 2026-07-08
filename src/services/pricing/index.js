const { buildPricingContextFromData } = require('./buildPricingContext');
const { loadPricingContext } = require('./loadPricingContext');
const { applyPricingToProduct, applyPricingToProducts } = require('./applyProductPricing');
const { buildPricingScope, buildPricingScopeFromPricingScope } = require('./buildPricingScope');
const { compareClientCart, clientSubtotalFromLines, serverSubtotalFromLines } = require('./compareClientCart');
const { cartProductsToClientLines, toResolveLineInput } = require('./cartLineHelpers');
const { normalizeId, lineKey } = require('./normalizePricingIds');
const { resolveOriginalPrice, variantOriginalUnit } = require('./resolveOriginalPrice');
const {
  resolveVariantUnitPrice,
  resolveSingleProductUnitPrice,
  getWholeProductOverridePrices,
} = require('./resolveUnitPrice');
const { resolveCartPricing } = require('./resolveCartPricing');
const { shadowLogCheckoutPricing } = require('./shadowLogPricing');
const {
  decideCheckoutProductSubtotal,
  decidePaymentIntentProductSubtotal,
  resolvePaymentIntentProductSubtotal,
  resolveCheckoutProductSubtotal,
} = require('./resolvePaymentIntentProductSubtotal');
const { applyServerPricesToCart } = require('./applyServerPricesToCart');
const {
  pricingResultToHttp,
  checkoutTotalToHttp,
  logCheckoutPricingBlocked,
  logCheckoutPricingSuccess,
} = require('./checkoutPricingHttp');
const { resolveCoupon, calculateDiscountAmount } = require('./resolveCoupon');
const { resolveShipping } = require('./resolveShipping');
const { computeCheckoutTotal } = require('./computeCheckoutTotal');
const {
  verifyPaymentForOrder,
  extractPaymentIntentId,
  validatePaymentIntentState,
  validatePaymentAmount,
  validatePaymentOwnership,
} = require('./verifyPaymentForOrder');

module.exports = {
  buildPricingContextFromData,
  loadPricingContext,
  applyPricingToProduct,
  applyPricingToProducts,
  buildPricingScope,
  buildPricingScopeFromPricingScope,
  compareClientCart,
  clientSubtotalFromLines,
  serverSubtotalFromLines,
  cartProductsToClientLines,
  toResolveLineInput,
  normalizeId,
  lineKey,
  resolveOriginalPrice,
  variantOriginalUnit,
  resolveVariantUnitPrice,
  resolveSingleProductUnitPrice,
  getWholeProductOverridePrices,
  resolveCartPricing,
  shadowLogCheckoutPricing,
  decideCheckoutProductSubtotal,
  decidePaymentIntentProductSubtotal,
  resolvePaymentIntentProductSubtotal,
  resolveCheckoutProductSubtotal,
  applyServerPricesToCart,
  pricingResultToHttp,
  checkoutTotalToHttp,
  logCheckoutPricingBlocked,
  logCheckoutPricingSuccess,
  resolveCoupon,
  calculateDiscountAmount,
  resolveShipping,
  computeCheckoutTotal,
  verifyPaymentForOrder,
  extractPaymentIntentId,
  validatePaymentIntentState,
  validatePaymentAmount,
  validatePaymentOwnership,
};
