/**
 * Platform resolution for Ad Performance reports.
 * Priority matches AD_CAMPAIGN_ANALYTICS_IMPLEMENTATION.md §3.4:
 * gclid → Google Ads, ttclid → TikTok, msclkid → Microsoft,
 * fbclid/fbc/fbp → Meta, else utmSource, else referrer heuristics, else Direct.
 *
 * Field paths are adapted to this codebase's marketingAttribution shape
 * (clickIds.*, normalized.*, orderTouch/lastTouch/firstTouch).
 */

function nonEmptyStrExpr(fieldPath) {
  return {
    $gt: [{ $strLenCP: { $ifNull: [fieldPath, ''] } }, 0],
  };
}

function coalesceTouchField(field) {
  return {
    $let: {
      vars: {
        n: { $ifNull: [`$marketingAttribution.normalized.${field}`, ''] },
        o: { $ifNull: [`$marketingAttribution.orderTouch.${field}`, ''] },
        l: { $ifNull: [`$marketingAttribution.lastTouch.${field}`, ''] },
        f: { $ifNull: [`$marketingAttribution.firstTouch.${field}`, ''] },
      },
      in: {
        $cond: [
          { $gt: [{ $strLenCP: '$$n' }, 0] },
          '$$n',
          {
            $cond: [
              { $gt: [{ $strLenCP: '$$o' }, 0] },
              '$$o',
              {
                $cond: [
                  { $gt: [{ $strLenCP: '$$l' }, 0] },
                  '$$l',
                  {
                    $cond: [{ $gt: [{ $strLenCP: '$$f' }, 0] }, '$$f', ''],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  };
}

function referrerExpr() {
  return {
    $let: {
      vars: {
        o: { $ifNull: ['$marketingAttribution.orderTouch.referrer', ''] },
        l: { $ifNull: ['$marketingAttribution.lastTouch.referrer', ''] },
        f: { $ifNull: ['$marketingAttribution.firstTouch.referrer', ''] },
        od: { $ifNull: ['$marketingAttribution.orderTouch.referrerDomain', ''] },
        ld: { $ifNull: ['$marketingAttribution.lastTouch.referrerDomain', ''] },
        fd: { $ifNull: ['$marketingAttribution.firstTouch.referrerDomain', ''] },
      },
      in: {
        $cond: [
          { $gt: [{ $strLenCP: '$$o' }, 0] },
          '$$o',
          {
            $cond: [
              { $gt: [{ $strLenCP: '$$l' }, 0] },
              '$$l',
              {
                $cond: [
                  { $gt: [{ $strLenCP: '$$f' }, 0] },
                  '$$f',
                  {
                    $cond: [
                      { $gt: [{ $strLenCP: '$$od' }, 0] },
                      '$$od',
                      {
                        $cond: [
                          { $gt: [{ $strLenCP: '$$ld' }, 0] },
                          '$$ld',
                          {
                            $cond: [{ $gt: [{ $strLenCP: '$$fd' }, 0] }, '$$fd', ''],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  };
}

/** Mongo expression: resolved display platform for an Order document. */
function resolvePlatformExpression() {
  const utmSource = coalesceTouchField('source');
  const referrer = referrerExpr();

  return {
    $let: {
      vars: {
        utmSource,
        referrer,
        referrerLower: { $toLower: referrer },
        sourceLower: { $toLower: utmSource },
      },
      in: {
        $switch: {
          branches: [
            {
              case: {
                $or: [
                  nonEmptyStrExpr('$marketingAttribution.clickIds.gclid'),
                  nonEmptyStrExpr('$marketingAttribution.clickIds.gbraid'),
                  nonEmptyStrExpr('$marketingAttribution.clickIds.wbraid'),
                ],
              },
              then: 'Google Ads',
            },
            {
              case: nonEmptyStrExpr('$marketingAttribution.clickIds.ttclid'),
              then: 'TikTok Ads',
            },
            {
              case: nonEmptyStrExpr('$marketingAttribution.clickIds.msclkid'),
              then: 'Microsoft Ads',
            },
            {
              case: nonEmptyStrExpr('$marketingAttribution.clickIds.fbclid'),
              then: 'Meta Ads',
            },
            {
              case: { $gt: [{ $strLenCP: '$$utmSource' }, 0] },
              then: {
                $switch: {
                  branches: [
                    {
                      case: { $in: ['$$sourceLower', ['google', 'googleads', 'adwords']] },
                      then: 'Google Ads',
                    },
                    {
                      case: {
                        $in: ['$$sourceLower', ['facebook', 'instagram', 'meta', 'ig', 'fb']],
                      },
                      then: 'Meta Ads',
                    },
                    {
                      case: { $in: ['$$sourceLower', ['tiktok', 'tt']] },
                      then: 'TikTok Ads',
                    },
                    {
                      case: { $in: ['$$sourceLower', ['bing', 'microsoft', 'msn']] },
                      then: 'Microsoft Ads',
                    },
                  ],
                  default: '$$utmSource',
                },
              },
            },
            {
              case: { $gt: [{ $strLenCP: '$$referrer' }, 0] },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $or: [
                          { $regexMatch: { input: '$$referrerLower', regex: 'google\\.' } },
                          { $regexMatch: { input: '$$referrerLower', regex: 'bing\\.' } },
                          { $regexMatch: { input: '$$referrerLower', regex: 'yahoo\\.' } },
                          { $regexMatch: { input: '$$referrerLower', regex: 'duckduckgo\\.' } },
                        ],
                      },
                      then: 'Organic Search',
                    },
                    {
                      case: {
                        $or: [
                          { $regexMatch: { input: '$$referrerLower', regex: 'facebook\\.' } },
                          { $regexMatch: { input: '$$referrerLower', regex: 'instagram\\.' } },
                          { $regexMatch: { input: '$$referrerLower', regex: 'twitter\\.' } },
                          { $regexMatch: { input: '$$referrerLower', regex: 'x\\.com' } },
                          { $regexMatch: { input: '$$referrerLower', regex: 'linkedin\\.' } },
                          { $regexMatch: { input: '$$referrerLower', regex: 'tiktok\\.' } },
                        ],
                      },
                      then: 'Social Referral',
                    },
                  ],
                  default: 'Referral',
                },
              },
            },
          ],
          default: 'Direct',
        },
      },
    },
  };
}

/** Mongo expression: campaign name or '(unassigned)'. */
function resolveCampaignExpression() {
  return {
    $let: {
      vars: {
        campaign: coalesceTouchField('campaign'),
      },
      in: {
        $cond: [
          { $gt: [{ $strLenCP: '$$campaign' }, 0] },
          '$$campaign',
          '(unassigned)',
        ],
      },
    },
  };
}

function pickTouchFieldJs(attr, field) {
  if (!attr || typeof attr !== 'object') return '';
  const normalized = attr.normalized?.[field];
  if (normalized) return String(normalized);
  for (const key of ['orderTouch', 'lastTouch', 'firstTouch']) {
    const value = attr[key]?.[field];
    if (value) return String(value);
  }
  return '';
}

function pickReferrerJs(attr) {
  if (!attr || typeof attr !== 'object') return '';
  for (const key of ['orderTouch', 'lastTouch', 'firstTouch']) {
    const touch = attr[key];
    if (touch?.referrer) return String(touch.referrer);
    if (touch?.referrerDomain) return String(touch.referrerDomain);
  }
  return '';
}

/**
 * JS platform resolution (same priority as Mongo expression).
 * @param {object} orderOrAttr - Order doc or marketingAttribution subdoc
 */
function extractAttributionSubdoc(orderOrAttr) {
  if (!orderOrAttr || typeof orderOrAttr !== 'object') return null;
  if (orderOrAttr.marketingAttribution && typeof orderOrAttr.marketingAttribution === 'object') {
    return orderOrAttr.marketingAttribution;
  }
  if (orderOrAttr.attribution && typeof orderOrAttr.attribution === 'object') {
    return orderOrAttr.attribution;
  }
  // Already a bare attribution subdoc (has clickIds / touches / normalized)
  if (
    orderOrAttr.clickIds ||
    orderOrAttr.normalized ||
    orderOrAttr.firstTouch ||
    orderOrAttr.lastTouch ||
    orderOrAttr.orderTouch
  ) {
    return orderOrAttr;
  }
  return null;
}

function resolvePlatformInJs(orderOrAttr) {
  const attr = extractAttributionSubdoc(orderOrAttr);

  if (!attr || typeof attr !== 'object') return 'Direct';

  const clickIds = attr.clickIds || {};
  if (clickIds.gclid || clickIds.gbraid || clickIds.wbraid) return 'Google Ads';
  if (clickIds.ttclid) return 'TikTok Ads';
  if (clickIds.msclkid) return 'Microsoft Ads';
  if (clickIds.fbclid || clickIds.fbc || clickIds.fbp) return 'Meta Ads';

  const utmSource = pickTouchFieldJs(attr, 'source');
  if (utmSource) {
    const sourceLower = utmSource.toLowerCase();
    if (['google', 'googleads', 'adwords'].includes(sourceLower)) return 'Google Ads';
    if (['facebook', 'instagram', 'meta', 'ig', 'fb'].includes(sourceLower)) return 'Meta Ads';
    if (['tiktok', 'tt'].includes(sourceLower)) return 'TikTok Ads';
    if (['bing', 'microsoft', 'msn'].includes(sourceLower)) return 'Microsoft Ads';
    return utmSource;
  }

  const referrer = pickReferrerJs(attr).toLowerCase();
  if (referrer) {
    if (
      referrer.includes('google.') ||
      referrer.includes('bing.') ||
      referrer.includes('yahoo.') ||
      referrer.includes('duckduckgo.')
    ) {
      return 'Organic Search';
    }
    if (
      referrer.includes('facebook.') ||
      referrer.includes('instagram.') ||
      referrer.includes('twitter.') ||
      referrer.includes('x.com') ||
      referrer.includes('linkedin.') ||
      referrer.includes('tiktok.')
    ) {
      return 'Social Referral';
    }
    return 'Referral';
  }

  return 'Direct';
}

function resolveCampaignInJs(orderOrAttr) {
  const attr = extractAttributionSubdoc(orderOrAttr);
  const campaign = pickTouchFieldJs(attr, 'campaign');
  return campaign || '(unassigned)';
}

function isOrganicOrDirectPlatform(platform) {
  return [
    'Organic Search',
    'Social Referral',
    'Referral',
    'Direct',
    'Organic / Direct',
  ].includes(platform);
}

function buildSpendJoinKey(source, campaign) {
  return `${String(source || '').trim().toLowerCase()}||${String(campaign || '').trim().toLowerCase()}`;
}

module.exports = {
  resolvePlatformExpression,
  resolveCampaignExpression,
  resolvePlatformInJs,
  resolveCampaignInJs,
  isOrganicOrDirectPlatform,
  buildSpendJoinKey,
  coalesceTouchField,
  pickTouchFieldJs,
  pickReferrerJs,
};
