// modal/coupon.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the usage history schema for tracking coupon usage
const usageHistorySchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    orderId: {
        type: String,
        required: true
    },
    usedAt: {
        type: Date,
        default: Date.now
    }
});

const couponSchema = new Schema({
    code: {
        type: String,
        unique: true
        // required: true
    },
    discount_type: {
        type: String
        // required: true
    },
    discount: {
        type: Number
        // required: true
    },
    usage : {
        type: Number
        // required: true
    },
    used : {
        type: Number
        // required: true
    },
    expiryDate: {
        type: Date
        // required: true
    },
    allowMultiple: {
        type: Boolean,
        default: false
    },
    upto: {
        type :Number,
        default: null
    },
    minOrderValue: {
        type: Number,
        default: 0
    },
    // Track which users have used this coupon and on which orders
    usageHistory: [usageHistorySchema],
    status: {
        type: Number,
        default: 1
    }
});
module.exports = mongoose.model('Coupon', couponSchema)