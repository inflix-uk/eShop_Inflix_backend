const mongoose = require('mongoose');

// Define block content schema for the dynamic block editor
const blockSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'image', 'video', 'code', 'quote', 'widget', 'products']
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  width: {
    type: Number,
    default: null
  },
  height: {
    type: Number,
    default: null
  }
}, { _id: false });

// Define column schema for the block editor
const columnSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  width: {
    type: Number,
    required: true,
    default: 100
  },
  blocks: [blockSchema]
}, { _id: false });

// Define a schema for rows (used in block editor)
const rowSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'row'
  },
  columns: [columnSchema]
}, { _id: false });

// Main homepage data schema
const homepageDataSchema = new mongoose.Schema({
  blocks: [rowSchema],
  // SEO fields (same names / shapes as new blog: metaTags = meta keywords, metaSchema = URL list)
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' },
  metaTags: { type: [String], default: [] },
  metaSchema: { type: [String], default: [] },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save hook to update timestamps
homepageDataSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('HomepageData', homepageDataSchema);
