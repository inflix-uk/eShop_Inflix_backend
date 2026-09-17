const {
  upsertMarketingAdSpend,
  importMarketingAdSpendRows,
} = require('../services/analytics/adSpendRoasService');
const { parseAdSpendCsv, CSV_TEMPLATE } = require('../services/analytics/adSpendCsvService');

const analyticsAdSpendController = {
  upsert: async (req, res) => {
    try {
      const body = req.body || {};
      const result = await upsertMarketingAdSpend({
        campaign: body.campaign,
        spendDate: body.spendDate || body.date,
        amount: body.amount,
        currency: body.currency,
        utmSource: body.utmSource || body.source,
        utmMedium: body.utmMedium || body.medium,
        utmChannel: body.utmChannel || body.channel,
        notes: body.notes,
        source: 'manual',
      });

      if (!result.ok) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: result.reason || 'Invalid ad spend payload',
        });
      }

      return res.status(200).json({
        success: true,
        status: 200,
        id: result.id,
      });
    } catch (error) {
      console.error('[analytics] upsertAdSpend:', error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Internal server error',
      });
    }
  },

  importCsv: async (req, res) => {
    try {
      const { csv, defaults } = req.body || {};
      if (!csv || typeof csv !== 'string') {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'csv text is required',
        });
      }

      const parsed = parseAdSpendCsv(csv, {
        utmSource: defaults?.utmSource || defaults?.source || 'google',
        utmMedium: defaults?.utmMedium || defaults?.medium || 'cpc',
        utmChannel: defaults?.utmChannel || defaults?.channel || 'google_ads',
        campaign: defaults?.campaign || '',
      });

      if (!parsed.ok) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: parsed.reason || 'Could not parse CSV',
        });
      }

      if (parsed.rows.length === 0) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'No valid rows found in CSV',
          parseErrors: parsed.errors,
        });
      }

      const result = await importMarketingAdSpendRows(parsed.rows, { source: 'import' });

      return res.status(200).json({
        success: true,
        status: 200,
        imported: result.imported,
        failed: result.failed,
        skippedDuringParse: parsed.skipped || 0,
        parseErrors: parsed.errors,
        importErrors: result.errors,
      });
    } catch (error) {
      console.error('[analytics] importAdSpend:', error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Internal server error',
      });
    }
  },

  template: async (_req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ad-spend-template.csv"');
    return res.status(200).send(CSV_TEMPLATE);
  },
};

module.exports = analyticsAdSpendController;
