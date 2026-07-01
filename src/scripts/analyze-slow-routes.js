/**
 * analyze-slow-routes.js — one-off diagnostic (safe, read-only).
 * Reproduces the /admin/logs "slowest routes" aggregation for the last N hours
 * so we can see which endpoints are slow and how often they're hit.
 *
 *   node src/scripts/analyze-slow-routes.js          # last 24h, sorted by avg
 *   node src/scripts/analyze-slow-routes.js 48 max   # last 48h, sorted by worst-case
 */
try { require('dotenv').config(); } catch (_) {}

const mongoose = require('mongoose');
const AuditLog = require('../models/auditLog');

const HOURS = Math.min(720, Math.max(1, parseInt(process.argv[2], 10) || 24));
const SORT = ['avg', 'max', 'count'].includes(process.argv[3]) ? process.argv[3] : 'avg';

function resolveUri() {
  const raw = (process.env.MONGO_URI || process.env.DATABASE_URL || '').trim();
  return raw.replace(/^['"]|['"]$/g, '').replace(/^(MONGO_URI|DATABASE_URL)=/i, '').trim();
}

async function main() {
  await mongoose.connect(resolveUri(), { serverSelectionTimeoutMS: 20000, directConnection: true, family: 4 });
  console.log(`✅ ${mongoose.connection.name} | window=${HOURS}h | sort=${SORT}\n`);

  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);
  const sortStage = SORT === 'count' ? { count: -1 } : SORT === 'max' ? { maxMs: -1 } : { avgMs: -1 };

  const rows = await AuditLog.aggregate([
    { $match: { category: 'request', durationMs: { $ne: null }, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { route: '$route', method: '$method' },
        count: { $sum: 1 },
        avgMs: { $avg: '$durationMs' },
        maxMs: { $max: '$durationMs' },
        p95src: { $push: '$durationMs' },
        errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
      },
    },
    { $sort: sortStage },
    { $limit: 40 },
  ]);

  const totalReq = await AuditLog.countDocuments({ category: 'request', createdAt: { $gte: since } });
  console.log(`Total request logs in window: ${totalReq}\n`);
  console.log('  AVG   MAX    COUNT  ERR  METHOD ROUTE');
  console.log('  ----  -----  -----  ---  ------ -----------------------------------------');
  for (const r of rows) {
    const avg = String(Math.round(r.avgMs)).padStart(4);
    const max = String(r.maxMs).padStart(5);
    const cnt = String(r.count).padStart(5);
    const err = String(r.errors).padStart(3);
    const method = String(r._id.method || '').padEnd(6);
    console.log(`  ${avg}  ${max}  ${cnt}  ${err}  ${method} ${r._id.route}`);
  }

  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); try { await mongoose.disconnect(); } catch (_) {} process.exit(1); });
