const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  decideCheckoutProductSubtotal,
  resolvePaymentIntentProductSubtotal,
} = require('../resolvePaymentIntentProductSubtotal');
const { pricingResultToHttp } = require('../checkoutPricingHttp');

const PRODUCT_ID = '507f1f77bcf86cd799439011';
const VARIANT_ID = 'var001';

function clientLine(salePrice, qty = 1) {
  return {
    productId: PRODUCT_ID,
    variantId: VARIANT_ID,
    qty,
    salePrice,
    isTradeIn: false,
  };
}

function serverLine(unitPrice, qty = 1, overrides = {}) {
  return {
    productId: PRODUCT_ID,
    variantId: VARIANT_ID,
    qty,
    unitPrice,
    lineTotal: Math.round(unitPrice * qty * 100) / 100,
    priceSource: 'catalog',
    found: true,
    ...overrides,
  };
}

describe('checkout product subtotal (always server-authoritative)', () => {
  test('matching cart uses server subtotal', () => {
    const result = decideCheckoutProductSubtotal({
      clientLines: [clientLine(50, 2)],
      serverLines: [serverLine(50, 2)],
    });

    assert.equal(result.ok, true);
    assert.equal(result.totalSalePrice, 100);
    assert.equal(result.serverSubtotal, 100);
  });

  test('tampered client price returns PRICE_MISMATCH', () => {
    const result = decideCheckoutProductSubtotal({
      clientLines: [clientLine(10, 1)],
      serverLines: [serverLine(50, 1)],
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'PRICE_MISMATCH');
    const http = pricingResultToHttp(result);
    assert.equal(http.status, 409);
    assert.equal(http.body.code, 'PRICE_MISMATCH');
  });

  test('unresolved variant blocks checkout', () => {
    const result = decideCheckoutProductSubtotal({
      clientLines: [clientLine(25, 1)],
      serverLines: [serverLine(0, 1, { found: false, error: 'VARIANT_NOT_FOUND' })],
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'PRICING_UNRESOLVED');
    assert.equal(pricingResultToHttp(result).status, 400);
  });

  test('mismatch never falls back to client subtotal', () => {
    const result = decideCheckoutProductSubtotal({
      clientLines: [clientLine(10, 1)],
      serverLines: [serverLine(45, 1)],
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'PRICE_MISMATCH');
  });

  test('enforce on matching prices allows server amount', () => {
    const result = decideCheckoutProductSubtotal({
      clientLines: [clientLine(20, 2)],
      serverLines: [serverLine(20, 2)],
    });

    assert.equal(result.ok, true);
    assert.equal(result.totalSalePrice, 40);
  });

  test('legacy checkout session mode allows mismatch but bills server subtotal', () => {
    const result = decideCheckoutProductSubtotal({
      clientLines: [clientLine(5, 1)],
      serverLines: [serverLine(80, 1)],
      enforceClientPriceMatch: false,
    });

    assert.equal(result.ok, true);
    assert.equal(result.totalSalePrice, 80);
    assert.equal(result.clientPriceMismatch, true);
  });
});
