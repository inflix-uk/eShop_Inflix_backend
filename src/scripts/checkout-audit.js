#!/usr/bin/env node
/**
 * Read the checkout audit trail.
 *
 * Usage:
 *   node src/scripts/checkout-audit.js failures [--hours 24] [--limit 50]
 *   node src/scripts/checkout-audit.js journey <checkoutSessionId|bookingNumber|paymentIntentId|email>
 *   node src/scripts/checkout-audit.js funnel [--hours 24]
 *   node src/scripts/checkout-audit.js critical [--hours 168]
 *   node src/scripts/checkout-audit.js reasons [--hours 168]
 *   node src/scripts/checkout-audit.js tail [--limit 40]
 *
 * Everything is read-only.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const command = args[0] || 'help';

function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1 || i === args.length - 1) return fallback;
  const value = Number(args[i + 1]);
  return Number.isFinite(value) ? value : fallback;
}

const HOURS = flag('hours', 24);
const LIMIT = flag('limit', 50);
const since = () => new Date(Date.now() - HOURS * 3600 * 1000);

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const paint = (row) => {
  if (row.severity === 'critical') return c.red(`‼ ${row.event}`);
  if (row.outcome === 'failure') return c.red(`✗ ${row.event}`);
  if (row.outcome === 'blocked' || row.severity === 'warn') return c.yellow(`⚠ ${row.event}`);
  if (row.outcome === 'success') return c.green(`✓ ${row.event}`);
  return c.dim(`· ${row.event}`);
};

const when = (d) => new Date(d).toISOString().replace('T', ' ').slice(0, 19);

function line(row, { showSession = true } = {}) {
  const bits = [
    c.dim(when(row.createdAt)),
    paint(row),
    row.message || row.failureReason || '',
  ];
  const tail = [];
  if (row.bookingNumber) tail.push(`booking=${row.bookingNumber}`);
  if (row.customerEmail) tail.push(`email=${row.customerEmail}`);
  if (row.amount != null) tail.push(`amount=${row.amount}`);
  if (row.paymentIntentId) tail.push(`pi=${row.paymentIntentId.slice(0, 20)}`);
  if (showSession && row.checkoutSessionId) tail.push(`sess=${row.checkoutSessionId.slice(0, 12)}`);
  if (row.durationMs != null) tail.push(`${row.durationMs}ms`);
  if (tail.length) bits.push(c.dim(`[${tail.join(' ')}]`));
  return bits.filter(Boolean).join('  ');
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL, {
    serverSelectionTimeoutMS: 20000,
  });
  const Log = require('../models/checkoutAuditLog');

  if (command === 'failures') {
    const rows = await Log.find({
      createdAt: { $gte: since() },
      outcome: { $in: ['failure', 'blocked'] },
    }).sort({ createdAt: -1 }).limit(LIMIT).lean();

    console.log(c.bold(`\nFailures in the last ${HOURS}h — ${rows.length} shown\n`));
    rows.forEach((r) => console.log(line(r)));
    if (!rows.length) console.log(c.green('  none 🎉'));
  }

  else if (command === 'critical') {
    const rows = await Log.find({
      createdAt: { $gte: since() },
      severity: 'critical',
    }).sort({ createdAt: -1 }).limit(LIMIT).lean();

    console.log(c.bold(`\nCRITICAL in the last ${HOURS}h — money may be affected\n`));
    rows.forEach((r) => {
      console.log(line(r));
      if (r.errorMessage) console.log(c.dim(`      ${r.errorMessage}`));
    });
    if (!rows.length) console.log(c.green('  none 🎉'));
  }

  else if (command === 'journey') {
    const key = args[1];
    if (!key) return console.log('usage: journey <sessionId|bookingNumber|paymentIntentId|email>');

    const rows = await Log.find({
      $or: [
        { checkoutSessionId: key },
        { bookingNumber: key },
        { paymentIntentId: key },
        { customerEmail: String(key).toLowerCase() },
        { orderNumber: key },
      ],
    }).sort({ createdAt: 1 }).limit(500).lean();

    console.log(c.bold(`\nJourney for "${key}" — ${rows.length} events\n`));
    rows.forEach((r) => {
      console.log(line(r, { showSession: false }));
      if (r.failureReason && r.failureReason !== r.message) {
        console.log(c.dim(`      reason: ${r.failureReason}`));
      }
      if (r.errorMessage) console.log(c.dim(`      error:  ${r.errorMessage}`));
      if (r.stripeDeclineCode) console.log(c.dim(`      decline: ${r.stripeDeclineCode}`));
    });
    if (!rows.length) console.log(c.dim('  nothing found'));
  }

  else if (command === 'funnel') {
    const rows = await Log.aggregate([
      { $match: { createdAt: { $gte: since() } } },
      { $group: { _id: { stage: '$stage', outcome: '$outcome' }, n: { $sum: 1 } } },
    ]);

    const STAGE_ORDER = [
      'page_view', 'package_selected', 'slot_hold', 'details',
      'booking_create', 'payment_intent', 'payment_submit',
      'payment_result', 'webhook', 'confirm', 'complete',
    ];
    const table = {};
    rows.forEach((r) => {
      const s = r._id.stage;
      table[s] = table[s] || {};
      table[s][r._id.outcome] = r.n;
    });

    console.log(c.bold(`\nFunnel — last ${HOURS}h\n`));
    console.log(c.dim('stage'.padEnd(18) + 'started  success  failure  blocked'));
    STAGE_ORDER.forEach((s) => {
      const t = table[s];
      if (!t) return;
      console.log(
        s.padEnd(18) +
          String(t.started || 0).padStart(7) +
          String(t.success || 0).padStart(9) +
          c.red(String(t.failure || 0).padStart(9)) +
          c.yellow(String(t.blocked || 0).padStart(9))
      );
    });
  }

  else if (command === 'reasons') {
    const rows = await Log.aggregate([
      {
        $match: {
          createdAt: { $gte: since() },
          outcome: { $in: ['failure', 'blocked'] },
          failureReason: { $ne: null },
        },
      },
      { $group: { _id: '$failureReason', n: { $sum: 1 }, last: { $max: '$createdAt' } } },
      { $sort: { n: -1 } },
      { $limit: 30 },
    ]);

    console.log(c.bold(`\nWhy checkouts failed — last ${HOURS}h\n`));
    rows.forEach((r) => {
      console.log(`${String(r.n).padStart(5)}  ${r._id}  ${c.dim(when(r.last))}`);
    });
    if (!rows.length) console.log(c.green('  no failures 🎉'));
  }

  else if (command === 'tail') {
    const rows = await Log.find({}).sort({ createdAt: -1 }).limit(LIMIT).lean();
    console.log(c.bold(`\nMost recent ${rows.length} events\n`));
    rows.reverse().forEach((r) => console.log(line(r)));
  }

  else {
    console.log(`
${c.bold('Checkout audit')}

  failures  [--hours 24] [--limit 50]   what failed recently
  critical  [--hours 168]               money-affecting problems only
  journey   <id|bookingNo|pi|email>     one customer's full path
  funnel    [--hours 24]                where people drop off
  reasons   [--hours 168]               failure reasons, most common first
  tail      [--limit 40]                latest events
`);
  }

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('failed:', e.message);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
