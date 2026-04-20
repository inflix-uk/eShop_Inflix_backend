// models/productFaqs.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productFaqsSchema = new Schema({
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    },
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    status: {
        type: String,
        enum: ['Published', 'Draft'],
        default: 'Published'
    },
    order: {
        type: Number,
        default: 0
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
productFaqsSchema.index({ productId: 1, order: 1 });
productFaqsSchema.index({ productId: 1, status: 1 });

module.exports = mongoose.model('ProductFaq', productFaqsSchema);
