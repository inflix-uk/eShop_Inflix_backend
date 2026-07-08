const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { buildPricingContextFromData } = require('../buildPricingContext');
const { applyPricingToProduct } = require('../applyProductPricing');
const { resolveVariantUnitPrice } = require('../resolveUnitPrice');
const { compareClientCart } = require('../compareClientCart');

const PRODUCT_ID = '507f1f77bcf86cd799439011';

function makeContext({
  groupOverrides = [],
  userOverrides = [],
  excludedGroup = [],
  excludedUser = [],
} = {}) {
  return buildPricingContextFromData({
    groupOverrides,
    userOverrides,
    groupDoc: excludedGroup.length ? { excludedProductIds: excludedGroup } : null,
    userDoc: excludedUser.length ? { excludedProductIds: excludedUser } : null,
  });
}

function simpleProduct(price) {
  return {
    _id: PRODUCT_ID,
    name: 'Test Product',
    price,
    variantValues: [],
  };
}

describe('pricing service', () => {
  test('catalog price — no overrides uses product price', () => {
    const product = simpleProduct(99.99);
    const ctx = makeContext();
    const result = applyPricingToProduct(product, ctx);

    assert.equal(result.price, 99.99);
    assert.equal(result.originalPrice, 99.99);
    assert.equal(result.groupPrice, null);
    assert.equal(result.userPrice, null);
  });

  test('group override — whole-product row replaces catalog price', () => {
    const product = simpleProduct(99.99);
    const ctx = makeContext({
      groupOverrides: [{ productId: PRODUCT_ID, price: 79.5 }],
    });
    const result = applyPricingToProduct(product, ctx);

    assert.equal(result.price, 79.5);
    assert.equal(result.groupPrice, 79.5);
    assert.equal(result.userPrice, null);
  });

  test('user override — whole-product row replaces catalog price', () => {
    const product = simpleProduct(99.99);
    const ctx = makeContext({
      userOverrides: [{ productId: PRODUCT_ID, price: 69.25 }],
    });
    const result = applyPricingToProduct(product, ctx);

    assert.equal(result.price, 69.25);
    assert.equal(result.userPrice, 69.25);
    assert.equal(result.groupPrice, null);
  });

  test('user override beats group override', () => {
    const product = simpleProduct(99.99);
    const ctx = makeContext({
      groupOverrides: [{ productId: PRODUCT_ID, price: 80 }],
      userOverrides: [{ productId: PRODUCT_ID, price: 70 }],
    });
    const result = applyPricingToProduct(product, ctx);

    assert.equal(result.price, 70);
    assert.equal(result.groupPrice, 80);
    assert.equal(result.userPrice, 70);
  });

  test('excluded product falls back to catalog (group override ignored)', () => {
    const product = simpleProduct(99.99);
    const ctx = makeContext({
      groupOverrides: [{ productId: PRODUCT_ID, price: 50 }],
      excludedGroup: [PRODUCT_ID],
    });
    const result = applyPricingToProduct(product, ctx);

    assert.equal(result.price, 99.99);
    assert.equal(result.groupPrice, null);
  });

  test('variant price resolution — group variant-specific override', () => {
    const product = {
      _id: PRODUCT_ID,
      price: 120,
      variantValues: [
        {
          _id: 'var001',
          variantId: 'size-large',
          salePrice: '100',
          Price: '110',
        },
        {
          _id: 'var002',
          variantId: 'size-small',
          salePrice: '90',
          Price: '95',
        },
      ],
    };
    const ctx = makeContext({
      groupOverrides: [
        { productId: PRODUCT_ID, price: 75, variantKey: 'size-large' },
      ],
    });

    const large = resolveVariantUnitPrice(product, product.variantValues[0], 0, ctx);
    const small = resolveVariantUnitPrice(product, product.variantValues[1], 1, ctx);

    assert.equal(large.unitPrice, 75);
    assert.equal(large.priceSource, 'group');
    assert.equal(small.unitPrice, 90);
    assert.equal(small.priceSource, 'catalog');

    const listed = applyPricingToProduct(product, ctx);
    assert.equal(listed.variantValues[0].salePrice, '75');
    assert.equal(listed.variantValues[1].salePrice, '90');
    assert.equal(listed.price, 75);
  });

  test('variant user override beats group variant override', () => {
    const product = {
      _id: PRODUCT_ID,
      price: 120,
      variantValues: [
        { variantId: 'color-red', salePrice: '100', Price: '110' },
      ],
    };
    const ctx = makeContext({
      groupOverrides: [
        { productId: PRODUCT_ID, price: 85, variantKey: 'color-red' },
      ],
      userOverrides: [
        { productId: PRODUCT_ID, price: 72, variantKey: 'color-red' },
      ],
    });

    const resolved = resolveVariantUnitPrice(product, product.variantValues[0], 0, ctx);
    assert.equal(resolved.unitPrice, 72);
    assert.equal(resolved.priceSource, 'user');
  });

  test('compareClientCart — detects unit mismatch and subtotal delta', () => {
    const clientLines = [
      { productId: PRODUCT_ID, variantId: 'v1', qty: 2, salePrice: 50 },
      { productId: 'prod2', variantId: 'v2', qty: 1, salePrice: 30 },
    ];
    const serverLines = [
      { productId: PRODUCT_ID, variantId: 'v1', qty: 2, unitPrice: 45, lineTotal: 90, found: true },
      { productId: 'prod2', variantId: 'v2', qty: 1, unitPrice: 30, lineTotal: 30, found: true },
    ];

    const diff = compareClientCart(clientLines, serverLines);

    assert.equal(diff.matches, false);
    assert.equal(diff.mismatches.length, 1);
    assert.equal(diff.mismatches[0].reason, 'UNIT_PRICE_MISMATCH');
    assert.equal(diff.mismatches[0].delta, 5);
    assert.equal(diff.clientSubtotal, 130);
    assert.equal(diff.serverSubtotal, 120);
    assert.equal(diff.subtotalDelta, 10);
  });

  test('compareClientCart — matches within tolerance', () => {
    const clientLines = [
      { productId: PRODUCT_ID, variantId: 'v1', qty: 1, salePrice: 10.005 },
    ];
    const serverLines = [
      { productId: PRODUCT_ID, variantId: 'v1', qty: 1, unitPrice: 10, lineTotal: 10, found: true },
    ];

    const diff = compareClientCart(clientLines, serverLines, { tolerancePence: 1 });
    assert.equal(diff.matches, true);
    assert.equal(diff.mismatches.length, 0);
  });

  test('compareClientCart — unresolved server line', () => {
    const clientLines = [
      { productId: PRODUCT_ID, variantId: 'missing', qty: 1, salePrice: 25 },
    ];
    const serverLines = [];

    const diff = compareClientCart(clientLines, serverLines);
    assert.equal(diff.matches, false);
    assert.equal(diff.mismatches[0].reason, 'LINE_NOT_RESOLVED');
    assert.equal(diff.mismatches[0].serverUnitPrice, null);
  });
});
