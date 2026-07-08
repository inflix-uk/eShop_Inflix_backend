const ShippingSettings = require('../../models/shippingSettings');

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function normalizeMethodId(shippingMethodInput) {
  if (!shippingMethodInput) return null;
  return (
    shippingMethodInput.methodId ||
    shippingMethodInput._id ||
    shippingMethodInput.id ||
    null
  );
}

/**
 * Resolve shipping from DB. Ignores client-supplied price.
 */
async function resolveShipping({ shippingMethodInput, productSubtotal }) {
  const methodId = normalizeMethodId(shippingMethodInput);
  if (!methodId) {
    return { ok: true, shippingCost: 0, shippingMethod: null };
  }

  const settings = await ShippingSettings.getSettings();
  const activeMethods = (settings.methods || [])
    .filter((m) => m.isActive)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const method = activeMethods.find((m) => String(m._id) === String(methodId));
  if (!method) {
    return {
      ok: false,
      error: 'SHIPPING_INVALID',
      message: 'Selected shipping method is not available.',
    };
  }

  const subtotal = Number(productSubtotal) || 0;
  const cheapest = activeMethods[0];
  const isCheapest =
    cheapest && String(cheapest._id) === String(method._id);

  let shippingCost = Number(method.price) || 0;
  if (
    settings.freeShippingEnabled &&
    Number(settings.freeShippingThreshold) > 0 &&
    subtotal >= Number(settings.freeShippingThreshold) &&
    isCheapest
  ) {
    shippingCost = 0;
  }

  return {
    ok: true,
    shippingCost: roundMoney(shippingCost),
    shippingMethod: {
      name: method.name,
      price: roundMoney(shippingCost),
      estimatedDays: method.estimatedDays || '',
      methodId: String(method._id),
    },
  };
}

module.exports = {
  resolveShipping,
  normalizeMethodId,
};
