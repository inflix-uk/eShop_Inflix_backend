/**
 * Import Google Ads daily spend into MarketingAdSpend.
 *
 * CSV columns (header row required):
 *   - campaign: must match order UTM campaign / normalized.campaign
 *   - date: YYYY-MM-DD (UK reporting day)
 *   - cost: numeric GBP spend
 *
 * Usage:
 *   node scripts/importMarketingAdSpend.js path/to/spend.csv
 *   node scripts/importMarketingAdSpend.js path/to/spend.csv --apply
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { upsertMarketingAdSpend } = require('../src/services/analytics/adSpendRoasService');

function parseCsvLine(line) {
  const parts = line.split(',').map((part) => part.trim().replace(/^"|"$/g, ''));
  return parts;
}

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const campaignIdx = header.indexOf('campaign');
  const dateIdx = header.findIndex((h) => h === 'date' || h === 'day');
  const costIdx = header.findIndex((h) => h === 'cost' || h === 'spend' || h === 'amount');

  if (campaignIdx === -1 || dateIdx === -1 || costIdx === -1) {
    throw new Error('CSV must include campaign, date, and cost/spend/amount columns');
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    rows.push({
      campaign: cols[campaignIdx],
      spendDate: cols[dateIdx],
      amount: cols[costIdx],
    });
  }
  return rows;
}

async function main() {
  const csvPath = process.argv[2];
  const apply = process.argv.includes('--apply');

  if (!csvPath) {
    console.error('Usage: node scripts/importMarketingAdSpend.js <file.csv> [--apply]');
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
    const preview = `${row.spendDate} | ${row.campaign} | £${row.amount}`;
    if (!apply) {
      console.log(`DRY  ${preview}`);
      ok += 1;
      continue;
    }

    const result = await upsertMarketingAdSpend({
      campaign: row.campaign,
      spendDate: row.spendDate,
      amount: row.amount,
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
