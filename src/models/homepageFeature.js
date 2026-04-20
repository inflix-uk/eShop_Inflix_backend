// models/homepageFeature.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const homepageFeatureSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    subtitle: {
        type: String,
        required: true,
        trim: true
    },
    iconImage: {
        type: String,
        default: null,
        trim: true
    },
    iconWidth: {
        type: Number,
        default: 25
    },
    iconHeight: {
        type: Number,
        default: 25
    },
    order: {
        type: Number,
        default: 0,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true,
    collection: 'homepagefeatures'
});

// Indexes for efficient queries
homepageFeatureSchema.index({ order: 1, isActive: 1 });
homepageFeatureSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('HomepageFeature', homepageFeatureSchema);
