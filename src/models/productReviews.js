// models/productReviews.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productReviewsSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    DateTime: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
productReviewsSchema.index({ productId: 1, status: 1 });
productReviewsSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ProductReview', productReviewsSchema);
