const BookingSettings = require('../models/bookingSettings');
const {
  normalizeMetaSchema,
  seoPayloadFromSettings,
  validateJsonLdString,
} = require('../utils/bookingSeoUtils');
const {
  sanitizePageContent,
  pageContentPayload,
} = require('../utils/bookingPageContent');

const bookingSettingsController = {
  getPublicSettings: async (req, res) => {
    try {
      const settings = await BookingSettings.getSettings();
      return res.json({
        message: 'Booking settings fetched successfully',
        status: 200,
        settings: {
          isEnabled: settings.isEnabled,
          slotIntervalMinutes: settings.slotIntervalMinutes,
          holdDurationMinutes: settings.holdDurationMinutes,
          timezone: settings.timezone,
          minAdvanceBookingHours: settings.minAdvanceBookingHours,
          maxAdvanceBookingDays: settings.maxAdvanceBookingDays,
          slotIntervalDisplayUnit: settings.slotIntervalDisplayUnit || 'minutes',
          holdDurationDisplayUnit: settings.holdDurationDisplayUnit || 'minutes',
          minAdvanceDisplayUnit: settings.minAdvanceDisplayUnit || 'hours',
          studioMicCapacity: Number(settings.studioMicCapacity) || 5,
          extraMicPricePerHour: Number(settings.extraMicPricePerHour) || 15,
        },
      });
    } catch (error) {
      console.error('Error fetching public booking settings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  getAdminSettings: async (req, res) => {
    try {
      const settings = await BookingSettings.getSettings();
      return res.json({
        message: 'Booking settings fetched successfully',
        status: 200,
        settings,
      });
    } catch (error) {
      console.error('Error fetching admin booking settings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const {
        isEnabled,
        slotIntervalMinutes,
        holdDurationMinutes,
        timezone,
        minAdvanceBookingHours,
        maxAdvanceBookingDays,
        slotIntervalDisplayUnit,
        holdDurationDisplayUnit,
        minAdvanceDisplayUnit,
        studioMicCapacity,
        extraMicPricePerHour,
        updatedBy,
      } = req.body;

      const settings = await BookingSettings.getSettings();

      if (isEnabled !== undefined) settings.isEnabled = Boolean(isEnabled);
      if (slotIntervalMinutes !== undefined) settings.slotIntervalMinutes = Number(slotIntervalMinutes);
      if (holdDurationMinutes !== undefined) settings.holdDurationMinutes = Number(holdDurationMinutes);
      if (timezone !== undefined) settings.timezone = String(timezone).trim();
      if (minAdvanceBookingHours !== undefined) {
        settings.minAdvanceBookingHours = Number(minAdvanceBookingHours);
      }
      if (maxAdvanceBookingDays !== undefined) {
        settings.maxAdvanceBookingDays = Number(maxAdvanceBookingDays);
      }
      if (slotIntervalDisplayUnit === 'hours' || slotIntervalDisplayUnit === 'minutes') {
        settings.slotIntervalDisplayUnit = slotIntervalDisplayUnit;
      }
      if (holdDurationDisplayUnit === 'hours' || holdDurationDisplayUnit === 'minutes') {
        settings.holdDurationDisplayUnit = holdDurationDisplayUnit;
      }
      if (minAdvanceDisplayUnit === 'hours' || minAdvanceDisplayUnit === 'minutes') {
        settings.minAdvanceDisplayUnit = minAdvanceDisplayUnit;
      }
      if (studioMicCapacity !== undefined) {
        settings.studioMicCapacity = Math.max(1, Number(studioMicCapacity) || 5);
      }
      if (extraMicPricePerHour !== undefined) {
        settings.extraMicPricePerHour = Math.max(0, Number(extraMicPricePerHour) || 0);
      }
      if (updatedBy) settings.updatedBy = updatedBy;

      await settings.save();

      return res.json({
        message: 'Booking settings updated successfully',
        status: 200,
        settings,
      });
    } catch (error) {
      console.error('Error updating booking settings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  /** GET /booking/settings/seo (admin) */
  getAdminSeo: async (req, res) => {
    try {
      const settings = await BookingSettings.getSettings();
      return res.json({
        success: true,
        data: seoPayloadFromSettings(settings),
      });
    } catch (error) {
      console.error('Error fetching booking SEO:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch booking SEO',
      });
    }
  },

  /** GET /booking/settings/public/seo */
  getPublicSeo: async (req, res) => {
    try {
      const settings = await BookingSettings.getSettings();
      return res.json({
        success: true,
        data: seoPayloadFromSettings(settings),
      });
    } catch (error) {
      console.error('Error fetching public booking SEO:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch booking SEO',
      });
    }
  },

  /** PATCH /booking/settings/seo (admin) — metaTitle, metaDescription, metaSchema | jsonLd */
  patchSeo: async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' && !Array.isArray(req.body)
          ? req.body
          : {};

      const settings = await BookingSettings.getSettings();
      let changed = false;

      if (Object.prototype.hasOwnProperty.call(body, 'metaTitle')) {
        settings.metaTitle =
          typeof body.metaTitle === 'string'
            ? body.metaTitle.trim()
            : String(body.metaTitle ?? '').trim();
        changed = true;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'metaDescription')) {
        settings.metaDescription =
          typeof body.metaDescription === 'string'
            ? body.metaDescription.trim()
            : String(body.metaDescription ?? '').trim();
        changed = true;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'jsonLd')) {
        const check = validateJsonLdString(body.jsonLd);
        if (!check.ok) {
          return res.status(400).json({ success: false, message: check.message });
        }
        settings.metaSchema = check.value ? [check.value] : [];
        changed = true;
      } else if (Object.prototype.hasOwnProperty.call(body, 'metaSchema')) {
        const schemas = normalizeMetaSchema(body.metaSchema);
        for (const entry of schemas) {
          const check = validateJsonLdString(entry);
          if (!check.ok) {
            return res.status(400).json({
              success: false,
              message: check.message,
            });
          }
        }
        settings.metaSchema = schemas;
        changed = true;
      }

      if (!changed) {
        return res.status(400).json({
          success: false,
          message:
            'No valid SEO fields to update (metaTitle, metaDescription, jsonLd, metaSchema)',
        });
      }

      settings.seoUpdatedAt = new Date();
      await settings.save();

      return res.json({
        success: true,
        message: 'Booking SEO saved',
        data: seoPayloadFromSettings(settings),
      });
    } catch (error) {
      console.error('Error saving booking SEO:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save booking SEO',
      });
    }
  },

  /** GET /booking/settings/content (admin) — full editable page content */
  getAdminContent: async (req, res) => {
    try {
      const settings = await BookingSettings.getSettings();
      return res.json({
        success: true,
        data: {
          content: pageContentPayload(settings),
          updatedAt: settings.pageContentUpdatedAt || null,
        },
      });
    } catch (error) {
      console.error('Error fetching booking page content:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch booking page content',
      });
    }
  },

  /** GET /booking/settings/public/content — storefront content */
  getPublicContent: async (req, res) => {
    try {
      const settings = await BookingSettings.getSettings();
      return res.json({
        success: true,
        data: {
          content: pageContentPayload(settings),
        },
      });
    } catch (error) {
      console.error('Error fetching public booking page content:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch booking page content',
      });
    }
  },

  /** PATCH /booking/settings/content (admin) */
  patchPageContent: async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' && !Array.isArray(req.body)
          ? req.body
          : {};

      const incoming =
        body.content && typeof body.content === 'object' ? body.content : body;
      const nextContent = sanitizePageContent(incoming);

      const settings = await BookingSettings.getSettings();
      settings.pageContent = nextContent;
      settings.pageContentUpdatedAt = new Date();
      settings.markModified('pageContent');
      await settings.save();

      return res.json({
        success: true,
        message: 'Booking page content saved',
        data: {
          content: pageContentPayload(settings),
          updatedAt: settings.pageContentUpdatedAt,
        },
      });
    } catch (error) {
      console.error('Error saving booking page content:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save booking page content',
      });
    }
  },
};

module.exports = bookingSettingsController;
