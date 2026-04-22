const mongoose = require('mongoose');

const contactUsSubmissionSchema = new mongoose.Schema(
  {
    widgetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContactUsWidget',
      default: null,
    },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '', trim: true },
    userAgent: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContactUsSubmission', contactUsSubmissionSchema);
