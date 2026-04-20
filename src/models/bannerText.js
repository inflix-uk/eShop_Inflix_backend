const mongoose = require('mongoose');

const bannerTextSchema = new mongoose.Schema({
  feature1Title: {
    type: String,
    default: 'Fully Tested Devices'
  },
  feature1Description: {
    type: String,
    default: 'Buy with confidence'
  },
  feature2Title: {
    type: String,
    default: '18 Months Warranty'
  },
  feature2Description: {
    type: String,
    default: 'On all refurbished devices'
  },
  feature3Title: {
    type: String,
    default: 'Free & Fast Delivery'
  },
  feature3Description: {
    type: String,
    default: 'For all orders'
  },
  feature4Title: {
    type: String,
    default: '30 Days Free Return'
  },
  feature4Description: {
    type: String,
    default: '100% Refund'
  },
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
bannerTextSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BannerText', bannerTextSchema);
