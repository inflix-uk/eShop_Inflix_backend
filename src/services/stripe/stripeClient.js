const StripeSettings = require('../../models/stripeSettings');

let stripeInstance = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function getStripeInstance() {
  try {
    const keys = await StripeSettings.getActiveKeys();
    if (keys.secretKey) {
      return require('stripe')(keys.secretKey);
    }
  } catch (error) {
    console.error('Error getting Stripe keys from DB, using env fallback:', error.message);
  }
  return stripeInstance;
}

module.exports = {
  getStripeInstance,
};
