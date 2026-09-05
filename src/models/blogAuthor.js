const mongoose = require('mongoose');

/**
 * Shared Author / Reviewer profiles for the new blog system.
 * Previously stored only in admin localStorage, which caused disappear/re-add bugs.
 */
const blogAuthorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    designation: {
      type: String,
      default: '',
      trim: true,
    },
    role: {
      type: String,
      enum: ['author', 'reviewer'],
      default: 'author',
    },
    image: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    blocks: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

blogAuthorSchema.index({ email: 1, role: 1 });
blogAuthorSchema.index({ isActive: 1, role: 1, updatedAt: -1 });

module.exports = mongoose.model('BlogAuthor', blogAuthorSchema);
