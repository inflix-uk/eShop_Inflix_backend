const mongoose = require('mongoose');

// Category schema
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  slug: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create a unique index on the slug field
categorySchema.index({ slug: 1 }, { unique: true });

// Pre-save hook to generate slug if not provided
categorySchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Check if the model has already been defined
let Category;
try {
  // Try to get the existing model
  Category = mongoose.model('NewBlogCategory');
} catch (e) {
  // If the model doesn't exist, create it
  Category = mongoose.model('NewBlogCategory', categorySchema);
}

module.exports = {
  Category
};
