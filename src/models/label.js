const mongoose = require('mongoose');

const labelSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
        trim: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number, // Size in bytes
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    used:{
        type: Boolean,
        default: false
    },
    order:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Checkout'
    },
    returnOrder:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReturnOrder'
    },
    status: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });


labelSchema.index({ uploadDate: -1 }); // Index for sorting by upload date (descending)
labelSchema.index({ isDeleted: 1 }); // Index for filtering deleted/non-deleted labels
labelSchema.index({ status: 1 }); // Index for filtering by status
labelSchema.index({ uploadedBy: 1 }); // Index for filtering by user

// Compound indexes for common query patterns
labelSchema.index({ isDeleted: 1, status: 1 }); // Common filter combination
labelSchema.index({ uploadedBy: 1, uploadDate: -1 }); // User's labels sorted by date

module.exports = mongoose.model('Label', labelSchema);
