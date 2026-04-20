const mongoose = require('mongoose');

const customScriptEntrySchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: '',
    },
    placement: {
      type: String,
      enum: ['head', 'bodyStart', 'bodyEnd'],
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const siteScriptsSettingsSchema = new mongoose.Schema(
  {
    semrushScript: {
      type: String,
      default: '',
    },
    ahrefsScript: {
      type: String,
      default: '',
    },
    googleSearchConsoleScript: {
      type: String,
      default: '',
    },
    /** @deprecated Merged into customScripts in API; cleared on save */
    customHeadScript: {
      type: String,
      default: '',
    },
    customBodyStartScript: {
      type: String,
      default: '',
    },
    customBodyEndScript: {
      type: String,
      default: '',
    },
    customScripts: {
      type: [customScriptEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteScriptsSettings', siteScriptsSettingsSchema);
