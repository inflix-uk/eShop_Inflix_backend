const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  decideCheckoutProductSubtotal,
} = require('../resolvePaymentIntentProductSubtotal');
const { applyServerPricesToCart } = require('../applyServerPricesToCart');
const { clientSubtotalFromLines } = require('../compareClientCart');

const PRODUCT_ID = '507f1f77bcf86cd799439011';
const VARIANT_ID = 'var001';

function clientLine(salePrice, qty = 1, overrides = {}) {
  return {
    productId: PRODUCT_ID,
    variantId: VARIANT_ID,
    qty,
    salePrice,
    isTradeIn: false,
    ...overrides,
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

describe('order create pricing (always server-authoritative)', () => {
  test('matching order uses server subtotal', () => {
    const result = decideCheckoutProductSubtotal({
      clientLines: [clientLine(50, 2)],
      serverLines: [serverLine(50, 2)],
    });

    assert.equal(result.ok, true);
    assert.equal(result.totalSalePrice, 100);
  });

  test('tampered client salePrice returns PRICE_MISMATCH', () => {
    const result = decideCheckoutProductSubtotal({
      clientLines: [clientLine(1, 1)],
      serverLines: [serverLine(99, 1)],
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'PRICE_MISMATCH');
  });

  test('unresolved product returns PRICING_UNRESOLVED', () => {
    const result = decideCheckoutProductSubtotal({
      clientLines: [clientLine(20, 1)],
      serverLines: [serverLine(0, 1, { found: false, error: 'PRODUCT_NOT_FOUND' })],
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'PRICING_UNRESOLVED');
  });

  test('applyServerPricesToCart overwrites salePrice and Price', () => {
    const cart = [
      {
        productId: PRODUCT_ID,
        _id: VARIANT_ID,
        qty: 2,
        salePrice: 10,
        Price: 10,
        subtotal: 20,
        productName: 'Widget',
        SKU: 'W-1',
      },
    ];

    const priced = applyServerPricesToCart(cart, [serverLine(45, 2)]);

    assert.equal(priced[0].salePrice, 45);
    assert.equal(priced[0].Price, 45);
    assert.equal(priced[0].subtotal, 90);
    assert.equal(priced[0].productName, 'Widget');
  });

  test('trade-in lines are excluded from chargeable subtotal', () => {
    const clientLines = [
      clientLine(100, 1),
      {
        productId: 'trade-in',
        variantId: '',
        qty: 1,
        salePrice: -50,
        isTradeIn: true,
      },
    ];
    const serverLines = [
      serverLine(100, 1),
      serverLine(0, 1, { productId: 'trade-in', priceSource: 'trade_in' }),
    ];

    assert.equal(clientSubtotalFromLines(clientLines), 100);

    const result = decideCheckoutProductSubtotal({ clientLines, serverLines });
    assert.equal(result.ok, true);
    assert.equal(result.totalSalePrice, 100);
  });

  test('mismatch blocks order with serverLines payload', () => {
    const result = decideCheckoutProductSubtotal({
      clientLines: [clientLine(5, 1)],
      serverLines: [serverLine(55, 1)],
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'PRICE_MISMATCH');
    assert.ok(Array.isArray(result.serverLines));
    assert.ok(Array.isArray(result.mismatches));
  });
});
