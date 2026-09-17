/** Order statuses included in revenue / AOV / product revenue aggregations. */
const REVENUE_STATUSES = ['Pending', 'Approved', 'Shipped', 'Delivered'];

const CHANNEL_FILTERS = {
  google: { 'marketingAttribution.normalized.source': 'google' },
  facebook: {
    $or: [
      { 'marketingAttribution.normalized.source': { $in: ['facebook', 'instagram', 'meta'] } },
      { 'marketingAttribution.normalized.channel': 'paid_social' },
    ],
  },
  email: {
    $or: [
      { 'marketingAttribution.normalized.source': { $in: ['email', 'newsletter'] } },
      { 'marketingAttribution.normalized.medium': { $in: ['email', 'newsletter'] } },
      { 'marketingAttribution.normalized.channel': 'email' },
    ],
  },
  paid_search: { 'marketingAttribution.normalized.channel': 'paid_search' },
  paid_social: { 'marketingAttribution.normalized.channel': 'paid_social' },
  direct: { 'marketingAttribution.normalized.channel': 'direct' },
  referral: { 'marketingAttribution.normalized.channel': 'referral' },
  influencer: {
    $or: [
      { 'marketingAttribution.normalized.medium': 'influencer' },
      { 'marketingAttribution.normalized.source': 'influencer' },
    ],
  },
};

function buildChannelMatch(channel) {
  if (!channel || channel === 'all') return null;
  const key = String(channel).toLowerCase();
  return CHANNEL_FILTERS[key] || null;
}

/**
 * Base match: non-deleted orders in createdAt range (+ optional channel).
 */
function buildBaseMatch(startDate, endDate, channel) {
  const match = {
    isdeleted: { $ne: true },
    createdAt: { $gte: startDate, $lte: endDate },
  };

  const channelMatch = buildChannelMatch(channel);
  if (channelMatch) {
    Object.assign(match, channelMatch);
  }

  return match;
}

/**
 * Revenue-eligible orders: base match + countable statuses + positive totalOrderValue.
 */
function buildRevenueMatch(startDate, endDate, channel) {
  return {
    ...buildBaseMatch(startDate, endDate, channel),
    status: { $in: REVENUE_STATUSES },
    totalOrderValue: { $gt: 0 },
  };
}

/**
 * Revenue match for a nested attribution channel (email, influencer) respecting toolbar filter.
 */
function buildNestedChannelRevenueMatch(startDate, endDate, selectedChannel, nestedChannel) {
  if (selectedChannel !== 'all' && selectedChannel !== nestedChannel) {
    return {
      ...buildRevenueMatch(startDate, endDate, selectedChannel),
      'marketingAttribution.normalized.channel': '__none__',
    };
  }
  return buildRevenueMatch(startDate, endDate, nestedChannel);
}

module.exports = {
  REVENUE_STATUSES,
  buildBaseMatch,
  buildRevenueMatch,
  buildChannelMatch,
  buildNestedChannelRevenueMatch,
};
