const mongoose = require('mongoose');

const DealSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    desc: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['Deal', 'Coupon'],
        required: true
    },
    startDate: {
        type: Date,
        default: null
    },
    hasExpiry: {
        type: Boolean,
        default: true
    },
    expiryDate: {
        type: Date,
        default: null
    },
    link: {
        type: String,
        default: null
    },
    buttonText: {
        type: String,
        default: null,
        trim: true
    },
    couponCode: {
        type: String,
        default: null
    },
    emoji: {
        type: String,
        default: null
    },
    isExpired: {
        type: Boolean,
        default: false
    },
    isPublish: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    versionKey: false
});

// Indexes for common queries
DealSchema.index({ isExpired: 1, isPublish: 1, startDate: 1, expiryDate: 1, createdAt: -1 });

// Keep updatedAt fresh
DealSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Deal', DealSchema);




