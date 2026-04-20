// models/returnOrderOptions.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const returnOrderOptionsSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['account', 'platform', 'status', 'customerAsks'],
        required: true
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
});

// Compound index to ensure unique name per type
returnOrderOptionsSchema.index({ name: 1, type: 1 }, { unique: true });

const ReturnOrderOptions = mongoose.model('ReturnOrderOptions', returnOrderOptionsSchema);

module.exports = ReturnOrderOptions;
