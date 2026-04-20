const {
  WELCOME_FIELD_LABELS,
  HOT_UK_FIELD_LABELS,
} = require("../config/newsletterEmailTemplateDefaults");
const {
  getWelcomeResolved,
  getHotUkDealsResolved,
  saveSections,
} = require("../services/email/newsletterEmailCopyService");

const newsletterEmailTemplatesController = {
  async getAdmin(req, res) {
    try {
      const [welcome, hotUkDeals] = await Promise.all([
        getWelcomeResolved(),
        getHotUkDealsResolved(),
      ]);
      return res.status(200).json({
        success: true,
        data: {
          definitions: {
            welcome: { fieldLabels: WELCOME_FIELD_LABELS },
            hotUkDeals: { fieldLabels: HOT_UK_FIELD_LABELS },
          },
          templates: {
            welcome: welcome.fields,
            hotUkDeals: hotUkDeals.fields,
          },
        },
      });
    } catch (error) {
      console.error("newsletterEmailTemplates getAdmin:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to load newsletter email templates",
      });
    }
  },

  async saveAdmin(req, res) {
    try {
      await saveSections(req.body || {});
      const [welcome, hotUkDeals] = await Promise.all([
        getWelcomeResolved(),
        getHotUkDealsResolved(),
      ]);
      return res.status(200).json({
        success: true,
        message: "Newsletter email templates saved",
        data: {
          templates: {
            welcome: welcome.fields,
            hotUkDeals: hotUkDeals.fields,
          },
        },
      });
    } catch (error) {
      console.error("newsletterEmailTemplates saveAdmin:", error);
      const msg = error?.message || "Failed to save";
      const bad = msg.includes("must be a string");
      return res.status(bad ? 400 : 500).json({
        success: false,
        message: msg,
      });
    }
  },
};

module.exports = newsletterEmailTemplatesController;
