const MAX_IMPORT_ROWS = 15000;

function parseCsvLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts.map((part) => part.replace(/^"|"$/g, '').trim());
}

function normalizeHeaderName(header) {
  const key = String(header || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  if (['day', 'date', 'spenddate', 'spend date'].includes(key)) return 'spendDate';
  if (['campaign', 'campaign name', 'utm_campaign', 'utm campaign'].includes(key)) {
    return 'campaign';
  }
  if (['cost', 'spend', 'amount', 'cost (£)', 'cost (gbp)'].includes(key)) return 'amount';
  if (['utm_source', 'utm source', 'source'].includes(key)) return 'utmSource';
  if (['utm_medium', 'utm medium', 'medium'].includes(key)) return 'utmMedium';
  if (['utm_channel', 'utm channel', 'channel'].includes(key)) return 'utmChannel';
  if (['notes', 'note'].includes(key)) return 'notes';
  return null;
}

function parseAmount(value) {
  if (value == null || value === '') return null;
  const cleaned = String(value).replace(/[£,\s]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function normalizeSpendDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Parse ad spend CSV (Google Ads exports supported).
 * @param {string} csvText
 * @param {{ utmSource?: string, utmMedium?: string, utmChannel?: string }} defaults
 */
function parseAdSpendCsv(csvText, defaults = {}) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { ok: false, reason: 'CSV must include a header row and at least one data row', rows: [] };
  }

  const headerCells = parseCsvLine(lines[0]);
  const columnMap = {};
  headerCells.forEach((header, index) => {
    const normalized = normalizeHeaderName(header);
    if (normalized && columnMap[normalized] == null) {
      columnMap[normalized] = index;
    }
  });

  if (columnMap.spendDate == null || columnMap.amount == null) {
    return {
      ok: false,
      reason: 'CSV must include spendDate (or Day/date) and amount (or Cost/spend) columns',
      rows: [],
    };
  }

  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    if (cols.every((cell) => !cell)) continue;

    const spendDate = normalizeSpendDate(cols[columnMap.spendDate]);
    const amount = parseAmount(cols[columnMap.amount]);
    const campaign =
      columnMap.campaign != null ? cols[columnMap.campaign] : defaults.campaign || '';

    if (!spendDate) {
      errors.push({ line: i + 1, reason: 'invalid or missing date' });
      continue;
    }
    if (amount == null) {
      errors.push({ line: i + 1, reason: 'invalid or missing amount' });
      continue;
    }
    if (!String(campaign || '').trim()) {
      errors.push({ line: i + 1, reason: 'missing campaign (column or default)' });
      continue;
    }

    rows.push({
      campaign: String(campaign).trim(),
      spendDate,
      amount,
      utmSource:
        (columnMap.utmSource != null ? cols[columnMap.utmSource] : '') ||
        defaults.utmSource ||
        'google',
      utmMedium:
        (columnMap.utmMedium != null ? cols[columnMap.utmMedium] : '') ||
        defaults.utmMedium ||
        'cpc',
      utmChannel:
        (columnMap.utmChannel != null ? cols[columnMap.utmChannel] : '') ||
        defaults.utmChannel ||
        'google_ads',
      notes: columnMap.notes != null ? cols[columnMap.notes] : '',
    });
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      reason: `CSV exceeds the ${MAX_IMPORT_ROWS.toLocaleString()} row limit`,
      rows: [],
    };
  }

  return { ok: true, rows, errors, skipped: errors.length };
}

const CSV_TEMPLATE = [
  'campaign,spendDate,amount,utm_source,utm_medium,utm_channel,notes',
  'test-campaign,2026-06-29,5.00,google,cpc,google_ads,',
].join('\n');

module.exports = {
  MAX_IMPORT_ROWS,
  parseAdSpendCsv,
  CSV_TEMPLATE,
};
