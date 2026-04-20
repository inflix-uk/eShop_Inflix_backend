const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conversationTagSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    conversationId: {
        type: String,
        required: true
    },
    tags: [{
        name: {
            type: String,
            required: true
        },
        color: {
            type: String,
            default: '#3B82F6' // Default blue color
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
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
conversationTagSchema.index({ userId: 1, conversationId: 1 });
conversationTagSchema.index({ userId: 1, orderId: 1 });

const ConversationTag = mongoose.model('ConversationTag', conversationTagSchema);

module.exports = ConversationTag;
