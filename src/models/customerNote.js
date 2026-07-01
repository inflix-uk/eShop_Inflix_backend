const mongoose = require('mongoose');

const customerNoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    authorName: {
      type: String,
      default: '',
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Serves listNotes + buildCustomer360 notes lookup: find({ userId }) sorted by
// createdAt desc — the compound covers both the filter and the sort in one index.
customerNoteSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CustomerNote', customerNoteSchema);
