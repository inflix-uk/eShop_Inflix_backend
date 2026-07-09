function cartLineKey(product) {
  const productId = String(product.productId || product._id || '');
  const variantId = String(product._id || product.variantId || '');
  return `${productId}:${variantId}`;
}

function serverLineKey(line) {
  return `${String(line.productId || '')}:${String(line.variantId || '')}`;
}

function cleanVariantName(name) {
  return String(name || '').replace(/\s*\(#[\d\w]+\)/, '').trim();
}

/**
 * Build Stripe Checkout line_items from server-resolved prices only.
 * Client salePrice / coupon discount fields are never used for amounts.
 */
function buildCheckoutSessionLineItems({
  cartProducts,
  serverLines,
  productSubtotal,
  totalDiscount,
  shippingCost,
  shippingMethod,
  frontendUrl,
}) {
  const chargeableProducts = (cartProducts || []).filter((product) => !product.isTradeIn);
  const serverByKey = new Map();

  for (const line of serverLines || []) {
    if (line.isTradeIn || line.productId === 'trade-in') continue;
    serverByKey.set(serverLineKey(line), line);
  }

  const discountProportion =
    productSubtotal > 0 ? (Number(totalDiscount) || 0) / Number(productSubtotal) : 0;

  const lineItems = chargeableProducts.map((product) => {
    const serverLine = serverByKey.get(cartLineKey(product));
    const unitPrice = Number(serverLine?.unitPrice) || 0;
    const discountedUnitPrice = Math.max(0, unitPrice - unitPrice * discountProportion);

    const imageUrl =
      product.variantImages &&
      product.variantImages.length > 0 &&
      product.variantImages[0].path &&
      frontendUrl
        ? `${frontendUrl.replace(/\/$/, '')}/${encodeURIComponent(
            String(product.variantImages[0].path).replace(/^\//, '')
          )}`
        : null;

    const variantName = cleanVariantName(product.name);
    const displayName =
      product.productName && variantName
        ? `${product.productName} - ${variantName}`
        : product.productName || variantName || 'Product';

    return {
      price_data: {
        currency: 'GBP',
        product_data: {
          name: displayName,
          images: imageUrl ? [imageUrl] : [],
        },
        unit_amount: Math.round(discountedUnitPrice * 100),
      },
      quantity: Number(product.qty) || 1,
    };
  });

  if (Number(shippingCost) > 0) {
    lineItems.push({
      price_data: {
        currency: 'GBP',
        product_data: {
          name: shippingMethod?.name || 'Shipping',
        },
        unit_amount: Math.round(Number(shippingCost) * 100),
      },
      quantity: 1,
    });
  }

  return lineItems;
}

module.exports = {
  buildCheckoutSessionLineItems,
  cartLineKey,
  serverLineKey,
};
