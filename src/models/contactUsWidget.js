const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    label: { type: String, default: '', trim: true },
    value: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const fieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    label: { type: String, default: '', trim: true },
    type: {
      type: String,
      required: true,
      enum: ['text', 'email', 'textarea', 'select', 'radio', 'checkbox'],
    },
    placeholder: { type: String, default: '', trim: true },
    required: { type: Boolean, default: false },
    minLength: { type: Number, default: null },
    maxLength: { type: Number, default: null },
    pattern: { type: String, default: '' },
    helpText: { type: String, default: '', trim: true },
    options: { type: [optionSchema], default: [] },
    showWhenField: { type: String, default: '', trim: true },
    showWhenValue: { type: String, default: '', trim: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

/** Singleton CMS: dynamic Contact Us page form schema. */
const contactUsWidgetSchema = new mongoose.Schema(
  {
    isActive: { type: Boolean, default: true },
    title: { type: String, default: 'Contact us', trim: true },
    description: { type: String, default: '', trim: true },
    submitButtonLabel: { type: String, default: 'Send', trim: true },
    successMessage: {
      type: String,
      default: 'Your message has been sent. We will get back to you soon.',
      trim: true,
    },
    fields: { type: [fieldSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContactUsWidget', contactUsWidgetSchema);
