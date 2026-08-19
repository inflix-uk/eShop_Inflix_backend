function parseTruthyFlag(value) {
  const flag = String(value || '').trim().toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

/**
 * STRIPE_TEST_MODE=true  → test keys from .env
 * STRIPE_TEST_MODE=false or unset → live keys from Admin / MongoDB
 */
function isStripeTestMode() {
  return parseTruthyFlag(process.env.STRIPE_TEST_MODE);
}

function keyKind(key) {
  const value = String(key || '').trim();
  if (value.startsWith('sk_test_') || value.startsWith('pk_test_')) return 'test';
  if (value.startsWith('sk_live_') || value.startsWith('pk_live_')) return 'live';
  return 'unknown';
}

function pickKeyForMode(key, mode) {
  const value = String(key || '').trim();
  return keyKind(value) === mode ? value : '';
}

module.exports = {
  isStripeTestMode,
  keyKind,
  pickKeyForMode,
};
