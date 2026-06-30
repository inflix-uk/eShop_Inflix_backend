/**
 * Intersect order conversion IDs with in-range visitor/session population.
 * Prevents orders whose session started outside the range from inflating conversion rate.
 */

/**
 * @param {string[]} orderVisitorIds distinct visitorIds from revenue orders in range
 * @param {string[]} orderSessionIds distinct sessionIds from revenue orders in range
 * @param {{ visitorIds: Set<string>, sessionIds: Set<string> }} population
 */
function computeConvertedInPopulation(orderVisitorIds, orderSessionIds, population) {
  const visitors = (orderVisitorIds || []).filter(Boolean);
  const sessions = (orderSessionIds || []).filter(Boolean);

  let convertedVisitorsInRange = 0;
  let convertedSessionsInRange = 0;

  for (const id of visitors) {
    if (population.visitorIds.has(id)) convertedVisitorsInRange += 1;
  }

  for (const id of sessions) {
    if (population.sessionIds.has(id)) convertedSessionsInRange += 1;
  }

  const convertedVisitorsOutsideSessionPopulation = Math.max(
    0,
    visitors.length - convertedVisitorsInRange
  );
  const convertedSessionsOutsideSessionPopulation = Math.max(
    0,
    sessions.length - convertedSessionsInRange
  );

  return {
    convertedVisitorsInRange,
    convertedSessionsInRange,
    convertedVisitorsOutsideSessionPopulation,
    convertedSessionsOutsideSessionPopulation,
    conversionPopulationMismatch:
      convertedVisitorsOutsideSessionPopulation > 0 ||
      convertedSessionsOutsideSessionPopulation > 0,
  };
}

module.exports = {
  computeConvertedInPopulation,
};
