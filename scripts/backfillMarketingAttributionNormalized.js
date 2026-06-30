/**
 * Backfill marketingAttribution.normalized on orders with incomplete normalization.
 *
 * Dry-run by default. Pass --apply to write changes.
 *
 * Usage:
 *   node scripts/backfillMarketingAttributionNormalized.js
 *   node scripts/backfillMarketingAttributionNormalized.js --orderNumber AD20260080
 *   node scripts/backfillMarketingAttributionNormalized.js --startDate 2026-06-29 --endDate 2026-06-30
 *   node scripts/backfillMarketingAttributionNormalized.js --apply
 */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Order = require('../src/models/order');
const { normalizeMarketingAttribution } = require('../src/utils/marketingAttribution');
const { ukStartOfDay, ukEndOfDay } = require('../src/utils/analyticsDateRange');

function parseArgs(argv) {
  const args = {
    apply: false,
    orderNumber: null,
    startDate: null,
    endDate: null,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--orderNumber') args.orderNumber = argv[++i];
    else if (arg === '--startDate') args.startDate = argv[++i];
    else if (arg === '--endDate') args.endDate = argv[++i];
  }

  return args;
}

function isNormalizedComplete(normalized = {}) {
  if (!normalized || typeof normalized !== 'object') return false;
  const hasSourceMedium =
    Boolean(normalized.source) &&
    Boolean(normalized.medium) &&
    Boolean(normalized.sourceMedium);
  const hasChannel = Boolean(normalized.channel);
  return hasSourceMedium && hasChannel;
}

function needsNormalizedRepair(order) {
  const ma = order.marketingAttribution;
  if (!ma || ma.attributionStatus !== 'available') return false;
  if (isNormalizedComplete(ma.normalized)) return false;

  const hasTouchUtm =
    [ma.firstTouch, ma.lastTouch, ma.orderTouch].some(
      (touch) => touch?.source || touch?.medium || touch?.campaign
    );
  const hasClickIds =
    ma.clickIds &&
    (ma.clickIds.gclid || ma.clickIds.fbclid || ma.clickIds.gbraid || ma.clickIds.wbraid);

  return Boolean(hasTouchUtm || hasClickIds);
}

function buildRawFromStored(ma) {
  return {
    firstTouch: ma.firstTouch,
    lastTouch: ma.lastTouch,
    orderTouch: ma.orderTouch,
    clickIds: ma.clickIds,
    consent: ma.consent,
    sessionId: ma.sessionId,
    visitorId: ma.visitorId,
    attributionModel: ma.attributionModel,
  };
}

function summarizeNormalized(normalized) {
  if (!normalized) return '(empty)';
  return JSON.stringify({
    source: normalized.source || null,
    medium: normalized.medium || null,
    campaign: normalized.campaign || null,
    channel: normalized.channel || null,
    sourceMedium: normalized.sourceMedium || null,
  });
}

async function buildQuery(args) {
  const query = {
    isdeleted: { $ne: true },
    'marketingAttribution.attributionStatus': 'available',
  };

  if (args.orderNumber) {
    query.orderNumber = args.orderNumber;
    return query;
  }

  if (args.startDate && args.endDate) {
    query.createdAt = {
      $gte: ukStartOfDay(args.startDate),
      $lte: ukEndOfDay(args.endDate),
    };
  }

  return query;
}

async function main() {
  const args = parseArgs(process.argv);
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const query = await buildQuery(args);
  const candidates = await Order.find(query)
    .select('orderNumber marketingAttribution createdAt')
    .lean();

  const toRepair = candidates.filter(needsNormalizedRepair);

  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Candidates scanned: ${candidates.length}`);
  console.log(`Orders needing normalized repair: ${toRepair.length}\n`);

  let updated = 0;
  let skipped = 0;

  for (const order of toRepair) {
    const before = order.marketingAttribution?.normalized || {};
    const raw = buildRawFromStored(order.marketingAttribution);
    const result = normalizeMarketingAttribution(raw);
    const nextNormalized = result.normalized;

    if (!nextNormalized || isNormalizedComplete(before)) {
      skipped += 1;
      continue;
    }

    if (
      JSON.stringify(before) === JSON.stringify(nextNormalized) ||
      isNormalizedComplete(before)
    ) {
      skipped += 1;
      continue;
    }

    console.log(`— ${order.orderNumber}`);
    console.log(`  before: ${summarizeNormalized(before)}`);
    console.log(`  after:  ${summarizeNormalized(nextNormalized)}`);

    if (args.apply) {
      await Order.updateOne(
        { _id: order._id },
        { $set: { 'marketingAttribution.normalized': nextNormalized } }
      );
      updated += 1;
    }
  }

  console.log('\nSummary');
  console.log(`  repair candidates: ${toRepair.length}`);
  console.log(`  ${args.apply ? 'updated' : 'would update'}: ${args.apply ? updated : toRepair.length - skipped}`);
  console.log(`  skipped: ${skipped}`);

  if (!args.apply && toRepair.length > 0) {
    console.log('\nRe-run with --apply to write changes.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
