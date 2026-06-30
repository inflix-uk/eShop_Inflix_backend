/**
 * Clear Stripe keys stored in MongoDB so STRIPE_* values from .env are used.
 * Run: node scripts/useEnvStripeKeys.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const StripeSettings = require('../src/models/stripeSettings');

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set in .env');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const doc = await StripeSettings.findOne();
  if (!doc) {
    console.log('No StripeSettings document found — .env keys will be used.');
  } else {
    doc.secretKey = '';
    doc.publishableKey = '';
    await doc.save();
    console.log('Cleared Stripe keys in MongoDB — backend will use .env.');
  }

  const keys = await StripeSettings.getActiveKeys();
  const pk = keys.publishableKey || '';
  const mode = pk.startsWith('pk_test_') ? 'test' : pk.startsWith('pk_live_') ? 'live' : 'unknown';
  console.log('Active publishable key mode:', mode, `(${pk.slice(0, 12)}...)`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
