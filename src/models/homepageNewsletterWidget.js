const mongoose = require('mongoose');

const homepageNewsletterWidgetSchema = new mongoose.Schema(
  {
    heading: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    placeholder: { type: String, default: 'Enter your email', trim: true },
    buttonLabel: { type: String, default: 'Subscribe', trim: true },
    imageUrl: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HomepageNewsletterWidget', homepageNewsletterWidgetSchema);
