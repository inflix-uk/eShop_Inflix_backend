/**
 * Manual checkout pricing test — no commit required.
 * Usage: node scripts/testCheckoutPricing.js
 */
const BASE = process.env.BACKEND_URL || 'http://localhost:4000';

const shippingInformation = {
  firstName: 'Test',
  lastName: 'Buyer',
  phoneNumber: '07123456789',
  address: '1 Test Street',
  apartment: '',
  city: 'Manchester',
  county: 'Greater Manchester',
  postalCode: 'M1 1AA',
  country: 'United Kingdom',
};

const contactInformation = {
  email: 'pricing-test@example.com',
  userId: '',
};

const shippingMethod = {
  name: 'Standard',
  price: 3.99,
  estimatedDays: '3-5 days',
  methodId: 'standard',
};

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

async function main() {
  console.log('=== 1) Fetch product ===');
  const prodRes = await fetch(`${BASE}/get/product`);
  const prodJson = await prodRes.json();
  const product = prodJson.products?.[0];
  if (!product) throw new Error('No active products');

  const variant = product.variantValues?.[0];
  const unitPrice = Number(variant?.salePrice || product.price);
  const cartItem = {
    productId: product._id,
    _id: variant?._id || product._id,
    variantId: variant?.variantId,
    productName: product.name,
    name: variant?.name || product.name,
    salePrice: unitPrice,
    Price: unitPrice,
    qty: 1,
    isTradeIn: false,
  };

  console.log('Product:', product.name, '| server unit:', unitPrice);

  console.log('\n=== 2) Payment intent — matching client price (should succeed) ===');
  const piOk = await post('/create-payment-intent', {
    cartproducts: [cartItem],
    shippingInformation,
    contactInformation,
    orderNumber: `TEST-${Date.now()}`,
    shippingMethod,
  });
  console.log('Status:', piOk.status);
  console.log('Body:', JSON.stringify(piOk.body, null, 2));

  console.log('\n=== 3) Payment intent — tampered salePrice 0.01 (should 409) ===');
  const piBad = await post('/create-payment-intent', {
    cartproducts: [{ ...cartItem, salePrice: 0.01 }],
    shippingInformation,
    contactInformation,
    orderNumber: `TEST-BAD-${Date.now()}`,
    shippingMethod,
  });
  console.log('Status:', piBad.status);
  console.log('Body:', JSON.stringify(piBad.body, null, 2));

  console.log('\n=== 4) Create order — matching price, status Failed (no Stripe charge) ===');
  const orderOk = await post('/create/order', {
    cart: [cartItem],
    shippingInformation,
    contactInformation,
    status: 'Failed',
    shippingMethod,
    paymentDetails: { method: 'test-fake-stripe', note: 'fake card 4242... not confirmed' },
  });
  console.log('Status:', orderOk.status);
  console.log('Body:', JSON.stringify(orderOk.body, null, 2));

  console.log('\n=== 5) Create order — tampered salePrice (should 409) ===');
  const orderBad = await post('/create/order', {
    cart: [{ ...cartItem, salePrice: 0.01 }],
    shippingInformation,
    contactInformation,
    status: 'Failed',
    shippingMethod,
  });
  console.log('Status:', orderBad.status);
  console.log('Body:', JSON.stringify(orderBad.body, null, 2));

  if (piOk.body?.paymentIntentId) {
    console.log('\n=== 6) Stripe confirm with fake/test card (expected Stripe error if invalid key/mode) ===');
    console.log(
      'PaymentIntent created:', piOk.body.paymentIntentId,
      '| amount pence:', piOk.body.amount
    );
    console.log(
      'Real card charge requires Stripe.js on frontend or stripe payment_methods API.',
      'Use test card 4242 4242 4242 4242 in Stripe test mode on the website checkout UI.'
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
