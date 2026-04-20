// models/visitorMessage.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for attachments
const attachmentSchema = new Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    }
}, { _id: false });

// Schema for individual messages within a conversation
const messageItemSchema = new Schema({
    text: {
        type: String,
        default: ''
    },
    sender: {
        type: String,
        enum: ['user', 'bot', 'admin'],
        required: true
    },
    attachments: {
        type: [attachmentSchema],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Main visitor message/conversation schema
const visitorMessageSchema = new Schema({
    // Visitor information from the chat widget form
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    isOrderRelated: {
        type: String,
        enum: ['yes', 'no'],
        default: 'no'
    },
    orderNumber: {
        type: String,
        default: null
    },
    // Array of messages in the conversation
    messages: [messageItemSchema],
    // Read status for admin panel
    isRead: {
        type: Boolean,
        default: false
    },
    // Last message preview for list view
    lastMessage: {
        type: String,
        default: null
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    // Unread count for admin
    unreadCount: {
        type: Number,
        default: 0
    },
    // Session/visitor tracking
    sessionId: {
        type: String,
        default: null
    },
    // Status
    status: {
        type: String,
        enum: ['active', 'closed', 'archived'],
        default: 'active'
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

// Indexes for better query performance
visitorMessageSchema.index({ email: 1 });
visitorMessageSchema.index({ isRead: 1, lastMessageAt: -1 });
visitorMessageSchema.index({ createdAt: -1 });
visitorMessageSchema.index({ status: 1 });

// Update timestamps on save
visitorMessageSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('VisitorMessage', visitorMessageSchema);
