/**
 * Import offline orders into MarketingOfflineOrder.
 *
 * CSV columns (header row required):
 *   orderNumber,date,totalValue,channel,customerName,notes
 *
 * channel: phone | in_store | marketplace | wholesale | other
 *
 * Usage:
 *   node scripts/importMarketingOfflineOrders.js path/to/offline.csv
 *   node scripts/importMarketingOfflineOrders.js path/to/offline.csv --apply
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { upsertOfflineOrder } = require('../src/services/analytics/offlineOrdersService');

function parseCsvLine(line) {
  return line.split(',').map((part) => part.trim().replace(/^"|"$/g, ''));
}

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const orderNumberIdx = header.indexOf('ordernumber');
  const dateIdx = header.findIndex((h) => h === 'date' || h === 'orderdate');
  const valueIdx = header.findIndex((h) =>
    ['totalvalue', 'value', 'amount', 'revenue'].includes(h)
  );
  const channelIdx = header.indexOf('channel');
  const nameIdx = header.findIndex((h) => h === 'customername' || h === 'name');
  const notesIdx = header.indexOf('notes');

  if (dateIdx === -1 || valueIdx === -1) {
    throw new Error('CSV must include date and totalValue/value columns');
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    rows.push({
      orderNumber: orderNumberIdx >= 0 ? cols[orderNumberIdx] : undefined,
      orderDate: cols[dateIdx],
      totalValue: cols[valueIdx],
      channel: channelIdx >= 0 ? cols[channelIdx] : 'other',
      customerName: nameIdx >= 0 ? cols[nameIdx] : undefined,
      notes: notesIdx >= 0 ? cols[notesIdx] : undefined,
    });
  }
  return rows;
}

async function main() {
  const csvPath = process.argv[2];
  const apply = process.argv.includes('--apply');

  if (!csvPath) {
    console.error('Usage: node scripts/importMarketingOfflineOrders.js <file.csv> [--apply]');
    process.exit(1);
  }

  const absolutePath = path.resolve(csvPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(absolutePath, 'utf8'));
  console.log(`Parsed ${rows.length} row(s) from ${absolutePath}`);
  console.log(apply ? 'Mode: APPLY' : 'Mode: dry-run (pass --apply to write)');

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);

  let ok = 0;
  let failed = 0;

  for (const row of rows) {
    const preview = `${row.orderDate} | ${row.orderNumber || '(no #)'} | £${row.totalValue} | ${row.channel}`;
    if (!apply) {
      console.log(`DRY  ${preview}`);
      ok += 1;
      continue;
    }

    const result = await upsertOfflineOrder({
      ...row,
      source: 'import',
    });

    if (result.ok) {
      console.log(`OK   ${preview}`);
      ok += 1;
    } else {
      console.log(`FAIL ${preview} — ${result.reason}`);
      failed += 1;
    }
  }

  await mongoose.disconnect();
  console.log(`\n${ok} ok, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
