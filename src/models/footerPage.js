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
    // Must match blog block editor (BlocksTabForm) — footer pages reuse that UI
    enum: ['text', 'image', 'video', 'code', 'quote', 'widget', 'products']
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
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

// Define the main footer page schema
const footerPageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  blocks: [rowSchema],
  bannerImage: {
    type: String,
    default: null
  },
  bannerImageAlt: {
    type: String,
    default: ''
  },
  bannerImageDescription: {
    type: String,
    default: ''
  },
  publishStatus: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  publishDate: {
    type: Date,
    default: null
  },
  // SEO fields
  metaTitle: {
    type: String,
    default: null
  },
  metaDescription: {
    type: String,
    default: null
  },
  metaTags: {
    type: [String],
    default: []
  },
  metaSchema: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to update timestamps
footerPageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for efficient querying
footerPageSchema.index({ publishStatus: 1, publishDate: -1 });

const FooterPage = mongoose.model('FooterPage', footerPageSchema);

module.exports = FooterPage;
