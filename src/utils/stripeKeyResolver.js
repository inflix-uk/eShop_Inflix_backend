/**
 * Resolve which Stripe keys to use for payment processing.
 *
 * Production: MongoDB StripeSettings (admin panel) → fallback to env.
 * Local dev: set STRIPE_USE_ENV_KEYS=true in .env to always use env test keys
 *            and ignore live keys saved in the database.
 */

function isTruthyEnv(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function useEnvStripeKeys() {
  return isTruthyEnv(process.env.STRIPE_USE_ENV_KEYS);
}

function keysFromEnvironment() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    isFromDatabase: false,
    keySource: 'environment',
    envOverride: true,
  };
}

/**
 * @param {{ secretKey?: string, publishableKey?: string, webhookSecret?: string }} dbSettings
 */
function resolveStripeKeys(dbSettings = {}) {
  if (useEnvStripeKeys()) {
    return keysFromEnvironment();
  }

  const secretKey = dbSettings.secretKey || process.env.STRIPE_SECRET_KEY || '';
  const publishableKey =
    dbSettings.publishableKey || process.env.STRIPE_PUBLISHABLE_KEY || '';
  const webhookSecret =
    dbSettings.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
  const fromDb = !!(dbSettings.secretKey && dbSettings.publishableKey);

  return {
    secretKey,
    publishableKey,
    webhookSecret,
    isFromDatabase: fromDb,
    keySource: fromDb ? 'database' : 'environment',
    envOverride: false,
  };
}

module.exports = {
  useEnvStripeKeys,
  resolveStripeKeys,
};
