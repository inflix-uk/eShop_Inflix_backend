// One-off inspector: prints the most recent CheckoutLog rows so we can
// trace which path each payment (Link / card / Apple Pay / Google Pay) took.
// Run with:  node scripts/inspect-checkout-logs.js
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const CheckoutLog = require('../src/models/checkoutLog');

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected. DB:', mongoose.connection.name);

  const total = await CheckoutLog.countDocuments();
  console.log('Total logs:', total);

  if (total === 0) {
    console.log('\n⚠️  No checkout logs have been written yet.');
    console.log('   Either the backend has not been restarted since the logger was added,');
    console.log('   or no checkout attempts have happened since.');
    await mongoose.disconnect();
    return;
  }

  const rows = await CheckoutLog
    .find({})
    .sort({ createdAt: -1 })
    .limit(80)
    .lean();

  const byPI = new Map();
  for (const r of rows) {
    const key = r.paymentIntentId || '(no-pi)';
    if (!byPI.has(key)) byPI.set(key, []);
    byPI.get(key).push(r);
  }

  console.log('\n================ RECENT CHECKOUT LOGS (grouped by PaymentIntent) ================');
  for (const [pi, group] of byPI) {
    console.log('\n── PaymentIntent:', pi, '──');
    group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    for (const r of group) {
      const ts = new Date(r.createdAt).toISOString().replace('T', ' ').slice(0, 19);
      const pm = r.paymentMethodType ? ` [${r.paymentMethodType}]` : '';
      const ord = r.orderNumber ? ` order=${r.orderNumber}` : '';
      const extra = r.data ? ' ' + JSON.stringify(r.data) : '';
      console.log(`  ${ts} ${r.source.padEnd(8)} ${r.event}${pm}${ord}${extra}`);
    }
  }

  await mongoose.disconnect();
})().catch(err => {
  console.error('Inspector failed:', err.message);
  process.exit(1);
});
