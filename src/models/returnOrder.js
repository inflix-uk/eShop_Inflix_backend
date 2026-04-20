const mongoose = require('mongoose');

const returnOrderSchema = new mongoose.Schema({
    requestOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'RequestOrder', default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customerName: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    email: { type: String, default: null },
    address: { type: String, default: null },
    city: { type: String, default: null },
    postalCode: { type: String, default: null },
    orderNumber: { type: String, default: null },
    originalTrackingNumber: { type: String, default: null },
    returnTrackingNumber: { type: String, default: null },
    originalOrderNumber: { type: String, default: null },
    originalSerialNumber: { type: String, default: null },
    replacementSerialNumber: { type: String, default: null },
    rma: { type: String, default: null },
    reason: { type: String, default: null },
    notes: { type: String, default: null },
    account: { type: String, default: null },
    platform: { type: String, default: null },
    customerAsks: { type: String, default: null },
    status: { type: String, default: 'Pending' },
    productNames: { type: [String], default: null },
    orderImages: [{
        filename: String,
        path: String,
    }],
    orderDocuments: [{
        filename: String,
        path: String,
    }],
}, {
    timestamps: true 
});

// Middleware to set the RMA number before saving
returnOrderSchema.pre('save', async function (next) {
    if (!this.isNew || this.rma) {
        return next();
    }

    const lastOrder = await mongoose.model('ReturnOrder')
        .findOne({ rma: { $regex: /^RMA/ } })
        .sort({ createdAt: -1 });

    if (lastOrder) {
        const lastOrderNumber = parseInt(lastOrder.rma.slice(3), 10); // Extract the numeric part after "RMA"
        this.rma = `RMA${String(lastOrderNumber + 1).padStart(4, '0')}`;
    } else {
        this.rma = 'RMA0001'; // Default starting RMA if no previous orders exist
    }
    next();
});

// Middleware to update the `updatedAt` field
returnOrderSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const ReturnOrder = mongoose.model('ReturnOrder', returnOrderSchema);
module.exports = ReturnOrder;
