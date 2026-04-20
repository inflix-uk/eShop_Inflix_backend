const NewsletterEmailTemplateSettings = require("../../models/newsletterEmailTemplateSettings");
const {
  WELCOME_DEFAULTS,
  HOT_UK_DEFAULTS,
} = require("../../config/newsletterEmailTemplateDefaults");

function mergeSection(defaults, saved) {
  const out = { ...defaults };
  if (!saved || typeof saved !== "object") return out;
  for (const key of Object.keys(defaults)) {
    if (Object.prototype.hasOwnProperty.call(saved, key) && saved[key] != null) {
      const s = String(saved[key]);
      if (s.trim() !== "") out[key] = s;
    }
  }
  return out;
}

async function getWelcomeResolved() {
  const doc = await NewsletterEmailTemplateSettings.getSettings();
  const fields = mergeSection(WELCOME_DEFAULTS, doc.welcome);
  return {
    subject: fields.subject,
    fields,
  };
}

async function getHotUkDealsResolved() {
  const doc = await NewsletterEmailTemplateSettings.getSettings();
  const fields = mergeSection(HOT_UK_DEFAULTS, doc.hotUkDeals);
  return {
    subject: fields.subject,
    fields,
  };
}

/**
 * @param {{ welcome?: object, hotUkDeals?: object }} body
 */
async function saveSections(body) {
  const doc = await NewsletterEmailTemplateSettings.getSettings();
  const maxLen = 20000;

  if (body.welcome && typeof body.welcome === "object") {
    const next = { ...(doc.welcome && typeof doc.welcome === "object" ? doc.welcome : {}) };
    for (const key of Object.keys(WELCOME_DEFAULTS)) {
      if (!Object.prototype.hasOwnProperty.call(body.welcome, key)) continue;
      const v = body.welcome[key];
      if (v == null) continue;
      if (typeof v !== "string") {
        throw new Error(`welcome.${key} must be a string`);
      }
      next[key] = key === "subject" ? v.slice(0, 500) : v.slice(0, maxLen);
    }
    doc.welcome = next;
  }

  if (body.hotUkDeals && typeof body.hotUkDeals === "object") {
    const next = { ...(doc.hotUkDeals && typeof doc.hotUkDeals === "object" ? doc.hotUkDeals : {}) };
    for (const key of Object.keys(HOT_UK_DEFAULTS)) {
      if (!Object.prototype.hasOwnProperty.call(body.hotUkDeals, key)) continue;
      const v = body.hotUkDeals[key];
      if (v == null) continue;
      if (typeof v !== "string") {
        throw new Error(`hotUkDeals.${key} must be a string`);
      }
      next[key] = key === "subject" ? v.slice(0, 500) : v.slice(0, maxLen);
    }
    doc.hotUkDeals = next;
  }

  await doc.save();
  return doc;
}

module.exports = {
  getWelcomeResolved,
  getHotUkDealsResolved,
  saveSections,
  WELCOME_DEFAULTS,
  HOT_UK_DEFAULTS,
};
