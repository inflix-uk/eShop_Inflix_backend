const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mediaFileSchema = new Schema({
    filePath: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    directory: {
        type: String,
        required: true,
        trim: true
    },
    fileName: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        default: null,
        trim: true
    },
    altText: {
        type: String,
        default: null,
        trim: true
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
    timestamps: true
});

// Index for faster lookups by directory and fileName
mediaFileSchema.index({ directory: 1, fileName: 1 });

// Update the updatedAt field before saving
mediaFileSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const MediaFile = mongoose.model('MediaFile', mediaFileSchema);

module.exports = MediaFile;


