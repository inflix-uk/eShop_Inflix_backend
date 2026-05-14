const mongoose = require('mongoose');

const pageCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [200, 'Name cannot be more than 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

pageCategorySchema.index({ sortOrder: 1, name: 1 });

const PageCategory = mongoose.model('PageCategory', pageCategorySchema);

module.exports = PageCategory;
