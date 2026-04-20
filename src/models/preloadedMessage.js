const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const preloadedMessageSchema = new Schema({
    message: {
        type: String,
        required: true
    },
    isActive: {
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
    timestamps: true
});

// Index for faster queries
preloadedMessageSchema.index({ isActive: 1, createdAt: -1 });

const PreloadedMessage = mongoose.model('PreloadedMessage', preloadedMessageSchema);

module.exports = PreloadedMessage;
