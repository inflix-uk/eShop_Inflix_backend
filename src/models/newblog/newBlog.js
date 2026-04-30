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

// Define the main blog post schema
const blogSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    index: true,
    default: null,
  },
  newBlog: {
    type: Boolean,
    default: true
  },
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
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  excerpt: {
    type: String,
    required: [true, 'Excerpt is required'],
    maxlength: [500, 'Excerpt cannot be more than 500 characters']
  },
  blocks: [rowSchema],
  featuredImage: {
    type: String,
    required: [true, 'Featured image is required']
  },
  featuredImageAlt: {
    type: String,
    default: ''
  },
  featuredImageDescription: {
    type: String,
    default: ''
  },
  bannerImage: {
    type: String,
    required: [true, 'Banner image is required']
  },
  bannerImageAlt: {
    type: String,
    default: ''
  },
  bannerImageDescription: {
    type: String,
    default: ''
  },
  categories: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogCategory'
    }],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one category is required'
    }
  },
  tags: {
    type: [String],
    default: []
  },
  publishStatus: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  // SEO fields
  metaTitle: String,
  metaDescription: String,
  metaTags: [String],
  metaSchema: [String],
  // Author/Reviewer profile cards selected from admin blog editor
  author: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  reviewer: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
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
blogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create a virtual for full URL (useful for frontend)
blogSchema.virtual('url').get(function() {
  return `/blog/${this.slug}`;
});

// Create index for efficient querying
blogSchema.index({ slug: 1 });
blogSchema.index({ publishStatus: 1, publishDate: -1 });
blogSchema.index({ categories: 1 });
blogSchema.index({ tags: 1 });



const Blog = mongoose.model('NewBlog', blogSchema);

module.exports = {
  Blog
};
