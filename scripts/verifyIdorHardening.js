/**
 * Live API verification for IDOR hardening (no DB writes).
 * Usage: node scripts/verifyIdorHardening.js
 */
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const Order = require('../src/models/order');
const User = require('../src/models/user');
const { signAuthToken } = require('../src/utils/jwtAuth');
const { buildJwtPayload } = require('../src/utils/authCookies');
const { TOKEN_COOKIE_NAME } = require('../config/auth.config');

const PORT = Number(process.env.PORT) || 4000;
const API = `http://127.0.0.1:${PORT}`;

const results = { pass: 0, fail: 0, skip: 0 };

function pass(name, detail = '') {
  results.pass += 1;
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.fail += 1;
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function skip(name, detail = '') {
  results.skip += 1;
  console.log(`  SKIP  ${name}${detail ? ` — ${detail}` : ''}`);
}

function request(method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API);
    const payload = body ? JSON.stringify(body) : null;
    const headers = { Accept: 'application/json' };
    if (token) headers.Cookie = `${TOKEN_COOKIE_NAME}=${token}`;
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          let json = null;
          try { json = data ? JSON.parse(data) : null; } catch { /* ignore */ }
          resolve({ status: res.statusCode, json, raw: data });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function tokenFor(user) {
  return signAuthToken(buildJwtPayload(user));
}

async function findTestUsers() {
  const orders = await Order.find({
    isdeleted: false,
    'contactDetails.userId': { $exists: true, $ne: null, $ne: '' },
  })
    .select('contactDetails.userId _id orderNumber')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const byUser = new Map();
  for (const order of orders) {
    const uid = String(order.contactDetails.userId);
    if (!byUser.has(uid)) byUser.set(uid, order);
    if (byUser.size >= 2) break;
  }

  const userIds = [...byUser.keys()];
  if (userIds.length < 2) return null;

  const users = await User.find({ _id: { $in: userIds } }).lean();
  if (users.length < 2) return null;

  const userA = users[0];
  const userB = users[1];
  const orderA = byUser.get(String(userA._id));
  const orderB = byUser.get(String(userB._id));

  const admin = await User.findOne({ role: { $in: ['admin', 'superadmin'] } }).lean();

  return { userA, userB, orderA, orderB, admin };
}

async function main() {
  console.log('\n=== IDOR Hardening Live API Tests ===\n');

  const health = await request('GET', '/health');
  if (health.status !== 200) {
    console.error(`Backend not reachable at ${API} (health=${health.status})`);
    process.exit(1);
  }
  pass('Backend health', `port ${PORT}`);

  const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);

  const fixtures = await findTestUsers();
  if (!fixtures) {
    skip('Fixture users', 'Need at least 2 users with orders in DB');
    await mongoose.disconnect();
    process.exit(0);
  }

  const { userA, userB, orderA, orderB, admin } = fixtures;
  const tokenA = tokenFor(userA);
  const tokenB = tokenFor(userB);
  const tokenAdmin = admin ? tokenFor(admin) : null;

  console.log(`\nFixtures: UserA=${userA.email}, UserB=${userB.email}, OrderA=${orderA._id}, OrderB=${orderB._id}`);
  if (admin) console.log(`Admin: ${admin.email} (${admin.role})`);

  console.log('\n--- Positive (should succeed) ---');

  const myOrdersA = await request('GET', '/my/orders', { token: tokenA });
  if (myOrdersA.status === 200) pass('UserA GET /my/orders', `status ${myOrdersA.status}`);
  else fail('UserA GET /my/orders', `status ${myOrdersA.status}`);

  const myConvA = await request('GET', '/my/conversations', { token: tokenA });
  if (myConvA.status === 200) pass('UserA GET /my/conversations', `status ${myConvA.status}`);
  else fail('UserA GET /my/conversations', `status ${myConvA.status}`);

  const myOrderA = await request('GET', `/my/orders/${orderA._id}`, { token: tokenA });
  if (myOrderA.status === 200) pass('UserA GET own order via /my/orders/:id');
  else fail('UserA GET own order via /my/orders/:id', `status ${myOrderA.status}`);

  if (tokenAdmin && orderB) {
    const adminOrder = await request('GET', `/get/order/admin/${orderB._id}`, { token: tokenAdmin });
    if (adminOrder.status === 200) pass('Admin GET /get/order/admin/:id');
    else fail('Admin GET /get/order/admin/:id', `status ${adminOrder.status}`);
  } else {
    skip('Admin order access', 'No admin user in DB');
  }

  console.log('\n--- Negative (should be blocked) ---');

  const noAuth = await request('GET', '/my/orders');
  if (noAuth.status === 401) pass('Unauthenticated GET /my/orders → 401');
  else fail('Unauthenticated GET /my/orders', `expected 401, got ${noAuth.status}`);

  const crossOrder = await request('GET', `/get/order/${orderB._id}`, { token: tokenA });
  if (crossOrder.status === 403) pass('UserA cannot GET UserB order → 403');
  else fail('UserA GET UserB order', `expected 403, got ${crossOrder.status}`);

  const crossConv = await request('GET', `/get/conversations/${userB._id}`, { token: tokenA });
  if (crossConv.status === 403) pass('UserA cannot GET UserB conversations → 403');
  else fail('UserA GET UserB conversations', `expected 403, got ${crossConv.status}`);

  const crossOrdersList = await request('POST', '/get/order/user', {
    token: tokenA,
    body: { userId: String(userB._id) },
  });
  if (crossOrdersList.status === 403) pass('UserA cannot list UserB orders → 403');
  else fail('UserA POST /get/order/user as UserB', `expected 403, got ${crossOrdersList.status}`);

  const impersonateSend = await request('POST', `/send/messageFromUser/senderid/${userB._id}`, {
    token: tokenA,
    body: { message: 'idor-test' },
  });
  if (impersonateSend.status === 403) pass('UserA cannot send as UserB → 403');
  else fail('UserA send as UserB', `expected 403, got ${impersonateSend.status}`);

  const bookingNoAuth = await request('POST', '/get/booking/user', {
    body: { email: userA.email },
  });
  if (bookingNoAuth.status === 401) pass('Unauthenticated booking lookup → 401');
  else fail('Unauthenticated booking lookup', `expected 401, got ${bookingNoAuth.status}`);

  if (tokenAdmin) {
    const customerAdminRoute = await request('GET', `/get/order/admin/${orderA._id}`, { token: tokenA });
    if (customerAdminRoute.status === 403) pass('Customer cannot use admin order route → 403');
    else fail('Customer admin order route', `expected 403, got ${customerAdminRoute.status}`);
  }

  await mongoose.disconnect();

  console.log(`\n=== Summary: ${results.pass} passed, ${results.fail} failed, ${results.skip} skipped ===\n`);
  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
