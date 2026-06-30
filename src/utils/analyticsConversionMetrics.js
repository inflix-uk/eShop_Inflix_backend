/**
 * Shared conversion / traffic KPI rules for analytics overview.
 * Single source of truth — service and tests must use this module.
 */

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * Conversion rate = converted visitors (or sessions) / total visitors (or sessions).
 * Revenue orders without visitorId/sessionId do not inflate the numerator.
 *
 * @param {{
 *   convertedVisitorsInRange?: number,
 *   convertedSessionsInRange?: number,
 *   uniqueVisitorsInRange?: number,
 *   visitorSessionsInRange?: number,
 * }} params
 * @returns {{
 *   conversionRate: number|null,
 *   conversionRateDenominator: 'unique_visitors'|'sessions'|null,
 *   trafficKpiDenominator: 'visitors'|'sessions'|null,
 * }}
 */
function computeConversionMetrics({
  convertedVisitorsInRange,
  convertedSessionsInRange,
  uniqueVisitorsInRange,
  visitorSessionsInRange,
}) {
  const uniqueVisitors = Number(uniqueVisitorsInRange) || 0;
  const sessions = Number(visitorSessionsInRange) || 0;
  const convertedVisitors = Number(convertedVisitorsInRange) || 0;
  const convertedSessions = Number(convertedSessionsInRange) || 0;

  if (uniqueVisitors > 0) {
    return {
      conversionRate: round2((convertedVisitors / uniqueVisitors) * 100),
      conversionRateDenominator: 'unique_visitors',
      trafficKpiDenominator: 'visitors',
    };
  }

  if (sessions > 0) {
    return {
      conversionRate: round2((convertedSessions / sessions) * 100),
      conversionRateDenominator: 'sessions',
      trafficKpiDenominator: 'sessions',
    };
  }

  return {
    conversionRate: null,
    conversionRateDenominator: null,
    trafficKpiDenominator: null,
  };
}

module.exports = {
  computeConversionMetrics,
  round2,
};
