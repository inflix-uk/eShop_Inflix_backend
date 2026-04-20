const mongoose = require('mongoose');

const homepageSliderSlideSchema = new mongoose.Schema(
  {
    heading: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true }
);

const homepageSliderWidgetSchema = new mongoose.Schema(
  {
    slides: {
      type: [homepageSliderSlideSchema],
      default: [],
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HomepageSliderWidget', homepageSliderWidgetSchema);
