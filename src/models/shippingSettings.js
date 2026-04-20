const mongoose = require('mongoose');

const shippingMethodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  estimatedDays: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const shippingSettingsSchema = new mongoose.Schema({
  methods: [shippingMethodSchema],
  freeShippingThreshold: {
    type: Number,
    default: 0
  },
  freeShippingEnabled: {
    type: Boolean,
    default: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one document exists (singleton pattern)
shippingSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      methods: [
        {
          name: 'Standard Shipping',
          description: 'Delivery within 5-7 business days',
          price: 4.99,
          estimatedDays: '5-7 business days',
          isActive: true,
          order: 0
        },
        {
          name: 'Express Shipping',
          description: 'Delivery within 2-3 business days',
          price: 9.99,
          estimatedDays: '2-3 business days',
          isActive: true,
          order: 1
        }
      ],
      freeShippingThreshold: 50,
      freeShippingEnabled: true
    });
  }
  return settings;
};

// Get active shipping methods
shippingSettingsSchema.statics.getActiveMethods = async function() {
  const settings = await this.getSettings();
  return settings.methods
    .filter(method => method.isActive)
    .sort((a, b) => a.order - b.order);
};

module.exports = mongoose.model('ShippingSettings', shippingSettingsSchema);
