const mongoose = require('mongoose');

const schemaEntrySchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: '',
      trim: true,
    },
    schema: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const siteWideSchemaSettingsSchema = new mongoose.Schema(
  {
    schemas: {
      type: [schemaEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteWideSchema', siteWideSchemaSettingsSchema);
