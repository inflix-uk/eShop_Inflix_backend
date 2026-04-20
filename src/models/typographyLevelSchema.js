const mongoose = require('mongoose');
const { ALLOWED_FONTS, ALLOWED_WEIGHTS, ALLOWED_STYLES, DEFAULT_TYPOGRAPHY } = require('../utils/typographyConstants');

const typographyLevelSchema = new mongoose.Schema(
  {
    font: { type: String, enum: ALLOWED_FONTS, default: 'Inter' },
    weight: { type: Number, enum: ALLOWED_WEIGHTS, default: 400 },
    style: { type: String, enum: ALLOWED_STYLES, default: 'normal' },
  },
  { _id: false }
);

const typographySchema = new mongoose.Schema(
  {
    h1: { type: typographyLevelSchema, default: () => ({ ...DEFAULT_TYPOGRAPHY.h1 }) },
    h2: { type: typographyLevelSchema, default: () => ({ ...DEFAULT_TYPOGRAPHY.h2 }) },
    h3: { type: typographyLevelSchema, default: () => ({ ...DEFAULT_TYPOGRAPHY.h3 }) },
    p: { type: typographyLevelSchema, default: () => ({ ...DEFAULT_TYPOGRAPHY.p }) },
  },
  { _id: false }
);

module.exports = { typographySchema, typographyLevelSchema };
