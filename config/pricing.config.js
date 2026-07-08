/** Checkout pricing — server-authoritative; shadow log optional for debug only. */
const MISMATCH_TOLERANCE_PENCE = Number(process.env.PRICING_MISMATCH_TOLERANCE_PENCE) || 1;

function isShadowLogEnabled() {
  return process.env.PRICING_SHADOW_LOG !== 'false';
}

module.exports = {
  MISMATCH_TOLERANCE_PENCE,
  isShadowLogEnabled,
};
