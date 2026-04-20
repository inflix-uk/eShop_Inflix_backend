// model/message.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    orderId: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    returnOrderId: {
        type: Schema.Types.ObjectId,
        ref: 'ReturnOrder',
        default: null
    },
    requestOrder:{
        type: Object,
        default: {}
    },
    attachments: [{
        filename: String,
        path: String,
        mimetype: String
    }],
    participants: [String],
    message: String,
    readStatus: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    isdeleted: {
        type: Boolean,
        default: false
    },
});

// Indexes for better query performance
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, createdAt: -1 });
messageSchema.index({ participants: 1, createdAt: -1 });
messageSchema.index({ participants: 1, orderId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1, orderId: 1, readStatus: 1 });

module.exports = mongoose.model('Message', messageSchema);
 