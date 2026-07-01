const Order = require('../../models/order');
const { REVENUE_STATUSES, buildRevenueMatch } = require('../../utils/analyticsOrderMatch');

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function customerKeyPresentMatch() {
  return {
    customerKey: { $exists: true, $nin: [null, ''] },
  };
}

function customerKeyMissingMatch() {
  return {
    $or: [{ customerKey: { $exists: false } }, { customerKey: null }, { customerKey: '' }],
  };
}

/**
 * New vs returning customers from revenue-eligible orders in range.
 * Customer identity uses order.customerKey (logged-in user id or hashed guest email).
 * "New" = first revenue order on or after range start; "Returning" = first order before range start.
 */
async function getCustomerProfileMetrics(startDate, endDate, channel = 'all') {
  const revenueMatch = buildRevenueMatch(startDate, endDate, channel);

  const [customersInRange, ordersWithoutCustomerKey, revenueOrdersInRange] = await Promise.all([
    Order.aggregate([
      { $match: { ...revenueMatch, ...customerKeyPresentMatch() } },
      {
        $group: {
          _id: '$customerKey',
          ordersInRange: { $sum: 1 },
          revenueInRange: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
        },
      },
    ]),
    Order.countDocuments({ ...revenueMatch, ...customerKeyMissingMatch() }),
    Order.countDocuments(revenueMatch),
  ]);

  if (customersInRange.length === 0) {
    return {
      newCustomers: 0,
      returningCustomers: 0,
      customersInRange: 0,
      ordersFromNewCustomers: 0,
      ordersFromReturningCustomers: 0,
      revenueFromNewCustomers: 0,
      revenueFromReturningCustomers: 0,
      newCustomerShare: null,
      returningCustomerShare: null,
      ordersWithoutCustomerKey,
      revenueOrdersInRange,
      availability: 'unavailable',
    };
  }

  const keys = customersInRange.map((row) => row._id);

  const firstOrderRows = await Order.aggregate([
    {
      $match: {
        isdeleted: { $ne: true },
        status: { $in: REVENUE_STATUSES },
        totalOrderValue: { $gt: 0 },
        customerKey: { $in: keys },
        createdAt: { $lte: endDate },
      },
    },
    { $group: { _id: '$customerKey', firstOrderAt: { $min: '$createdAt' } } },
  ]);

  const firstOrderByKey = new Map(firstOrderRows.map((row) => [row._id, row.firstOrderAt]));

  let newCustomers = 0;
  let returningCustomers = 0;
  let ordersFromNewCustomers = 0;
  let ordersFromReturningCustomers = 0;
  let revenueFromNewCustomers = 0;
  let revenueFromReturningCustomers = 0;

  for (const row of customersInRange) {
    const firstOrderAt = firstOrderByKey.get(row._id);
    if (!firstOrderAt) continue;

    const isNew = firstOrderAt >= startDate;

    if (isNew) {
      newCustomers += 1;
      ordersFromNewCustomers += row.ordersInRange;
      revenueFromNewCustomers += row.revenueInRange;
    } else {
      returningCustomers += 1;
      ordersFromReturningCustomers += row.ordersInRange;
      revenueFromReturningCustomers += row.revenueInRange;
    }
  }

  const customersInRangeCount = newCustomers + returningCustomers;
  const newCustomerShare =
    customersInRangeCount > 0 ? round2((newCustomers / customersInRangeCount) * 100) : null;
  const returningCustomerShare =
    customersInRangeCount > 0
      ? round2((returningCustomers / customersInRangeCount) * 100)
      : null;

  return {
    newCustomers,
    returningCustomers,
    customersInRange: customersInRangeCount,
    ordersFromNewCustomers,
    ordersFromReturningCustomers,
    revenueFromNewCustomers: round2(revenueFromNewCustomers),
    revenueFromReturningCustomers: round2(revenueFromReturningCustomers),
    newCustomerShare,
    returningCustomerShare,
    ordersWithoutCustomerKey,
    revenueOrdersInRange,
    availability: customersInRangeCount > 0 ? 'available' : 'unavailable',
  };
}

module.exports = {
  getCustomerProfileMetrics,
};
