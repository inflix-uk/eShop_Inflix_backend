const mongoose = require('mongoose');

const productCardSettingsSchema = new mongoose.Schema({
  activeDesign: {
    type: String,
    enum: ['classic', 'modern'],
    default: 'classic'
  }
}, {
  timestamps: true,
  collection: 'productcardsettings'
});

// Singleton pattern - ensure only one document exists
productCardSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ activeDesign: 'classic' });
  }
  return settings;
};

// Update settings
productCardSettingsSchema.statics.updateSettings = async function(data) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(data);
  } else {
    if (data.activeDesign) {
      settings.activeDesign = data.activeDesign;
    }
    await settings.save();
  }
  return settings;
};

module.exports = 
  mongoose.models.ProductCardSettings ||
  mongoose.model('ProductCardSettings', productCardSettingsSchema);
