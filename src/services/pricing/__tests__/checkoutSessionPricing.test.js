const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { decideCheckoutProductSubtotal } = require('../resolvePaymentIntentProductSubtotal');
const { buildCheckoutSessionLineItems } = require('../buildCheckoutSessionLineItems');
const { calculateDiscountAmount } = require('../resolveCoupon');

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

function legacyCartProduct(salePrice, qty = 1) {
  return {
    productId: PRODUCT_ID,
    _id: VARIANT_ID,
    qty,
    salePrice,
    productName: 'Widget',
    name: 'Blue (#0000ff)',
    variantImages: [],
  };
}

describe('legacy checkout session pricing', () => {
  test('tampered client salePrice is ignored when enforceClientPriceMatch is false', () => {
    const result = decideCheckoutProductSubtotal({
      clientLines: [clientLine(1, 2)],
      serverLines: [serverLine(50, 2)],
      enforceClientPriceMatch: false,
    });

    assert.equal(result.ok, true);
    assert.equal(result.totalSalePrice, 100);
    assert.equal(result.clientPriceMismatch, true);
  });

  test('strict mode still blocks tampered client salePrice', () => {
    const result = decideCheckoutProductSubtotal({
      clientLines: [clientLine(1, 1)],
      serverLines: [serverLine(50, 1)],
      enforceClientPriceMatch: true,
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'PRICE_MISMATCH');
  });

  test('buildCheckoutSessionLineItems uses server unit prices not client salePrice', () => {
    const lineItems = buildCheckoutSessionLineItems({
      cartProducts: [legacyCartProduct(1, 2)],
      serverLines: [serverLine(50, 2)],
      productSubtotal: 100,
      totalDiscount: 0,
      shippingCost: 0,
      shippingMethod: null,
      frontendUrl: 'https://shop.example.com',
    });

    assert.equal(lineItems.length, 1);
    assert.equal(lineItems[0].price_data.unit_amount, 5000);
    assert.equal(lineItems[0].quantity, 2);
    assert.match(lineItems[0].price_data.product_data.name, /Widget/);
  });

  test('server coupon discount is applied to line items not client coupon body', () => {
    const coupon = {
      discount_type: 'flat',
      discount: 20,
    };
    const productSubtotal = 100;
    const totalDiscount = calculateDiscountAmount(productSubtotal, coupon);

    const lineItems = buildCheckoutSessionLineItems({
      cartProducts: [legacyCartProduct(999, 1)],
      serverLines: [serverLine(100, 1)],
      productSubtotal,
      totalDiscount,
      shippingCost: 0,
      shippingMethod: null,
      frontendUrl: 'https://shop.example.com',
    });

    assert.equal(totalDiscount, 20);
    assert.equal(lineItems[0].price_data.unit_amount, 8000);
  });

  test('fake client coupon discount fields are not used directly by line item builder', () => {
    const lineItems = buildCheckoutSessionLineItems({
      cartProducts: [legacyCartProduct(10, 1)],
      serverLines: [serverLine(100, 1)],
      productSubtotal: 100,
      totalDiscount: 0,
      shippingCost: 0,
      shippingMethod: null,
      frontendUrl: 'https://shop.example.com',
    });

    assert.equal(lineItems[0].price_data.unit_amount, 10000);
  });

  test('checkout total includes shipping line item from server shipping cost', () => {
    const lineItems = buildCheckoutSessionLineItems({
      cartProducts: [legacyCartProduct(50, 1)],
      serverLines: [serverLine(50, 1)],
      productSubtotal: 50,
      totalDiscount: 0,
      shippingCost: 5.5,
      shippingMethod: { name: 'Standard Delivery' },
      frontendUrl: 'https://shop.example.com',
    });

    assert.equal(lineItems.length, 2);
    assert.equal(lineItems[0].price_data.unit_amount, 5000);
    assert.equal(lineItems[1].price_data.unit_amount, 550);
    assert.equal(lineItems[1].price_data.product_data.name, 'Standard Delivery');
  });

  test('legacy payload shape still maps to stripe line items', () => {
    const cartproducts = [
      {
        productId: PRODUCT_ID,
        _id: VARIANT_ID,
        qty: 1,
        salePrice: 1,
        productName: 'Phone',
        name: '128GB',
        coupondata: { discount_type: 'flat', discount: 999 },
      },
    ];

    const lineItems = buildCheckoutSessionLineItems({
      cartProducts: cartproducts,
      serverLines: [serverLine(299, 1)],
      productSubtotal: 299,
      totalDiscount: 0,
      shippingCost: 0,
      shippingMethod: null,
      frontendUrl: 'https://shop.example.com',
    });

    assert.equal(lineItems.length, 1);
    assert.equal(lineItems[0].price_data.unit_amount, 29900);
  });
});
