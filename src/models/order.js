// models/order.js

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    cart: {
        type: Object,
        required: false
    },
    coupon :[],
    shippingDetails: {
        type: Object,
        required: false
    },
    shippingMethod: {
        name: { type: String },
        price: { type: Number },
        estimatedDays: { type: String },
        methodId: { type: String }
    },
    orderNumber :{
        type: String,
        required: false
    },
    contactDetails: {
        type: Object,
        required: false
    },
    paymentDetails: {
        type: Object,
        required: false
    },
    isdeleted: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Approved', 'Shipped', 'Delivered', 'Cancelled', 'Refunded', 'Failed', 'deleted'],
        default: 'Pending'
    },
    coupan: {
        type: Object,
        required: false
    },
    totalOrderValue: {
        type: Number,
        required: false
    },
    reason: {
        type: String,
        required: false
    },
    refund: {
        type: Object,
        required: false
    },
// Return Request tracking
    returnRequestInitiated: {
        type: Boolean,
        default: false
    },
    returnRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RequestOrder',
        default: null
    },
    returnRequestInitiatedAt: {
        type: Date,
        default: null
    },
    // Return Order tracking (when request is accepted/converted)
    returnOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReturnOrder',
        default: null
    },
    returnOrderConvertedAt: {
        type: Date,
        default: null
    },
    marketingAttribution: {
        schemaVersion: { type: Number, default: 1 },
        attributionModel: { type: String, default: 'last_non_direct_click' },
        firstTouch: {
            source: String,
            medium: String,
            campaign: String,
            content: String,
            term: String,
            referrer: String,
            referrerDomain: String,
            landingPage: String,
            capturedAt: Date,
        },
        lastTouch: {
            source: String,
            medium: String,
            campaign: String,
            content: String,
            term: String,
            referrer: String,
            referrerDomain: String,
            landingPage: String,
            capturedAt: Date,
        },
        orderTouch: {
            source: String,
            medium: String,
            campaign: String,
            content: String,
            term: String,
            referrer: String,
            referrerDomain: String,
            landingPage: String,
            capturedAt: Date,
        },
        clickIds: {
            gclid: String,
            gbraid: String,
            wbraid: String,
            fbclid: String,
            msclkid: String,
            ttclid: String,
        },
        campaignIds: {
            googleCampaignId: String,
            googleAdGroupId: String,
            googleCreativeId: String,
            metaCampaignId: String,
            metaAdSetId: String,
            metaAdId: String,
        },
        normalized: {
            source: String,
            medium: String,
            campaign: String,
            channel: String,
            sourceMedium: String,
        },
        sessionId: String,
        visitorId: String,
        consent: {
            analytics: Boolean,
            marketing: Boolean,
            capturedAt: Date,
        },
        capturedAt: { type: Date, default: Date.now },
        attributionStatus: {
            type: String,
            enum: ['available', 'partial', 'direct', 'missing', 'consent_denied'],
            default: 'missing',
        },
    },
    customerKey: {
        type: String,
        required: false,
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
    }
    
    
});

// Index for filtering by isdeleted status
orderSchema.index({ isdeleted: 1 });

// Index for sorting by creation date (used in almost all queries)
orderSchema.index({ createdAt: -1 });

// Compound index for common query pattern (isdeleted + sort by date)
orderSchema.index({ isdeleted: 1, createdAt: -1 });

// Index for user-specific order lookups
orderSchema.index({ 'contactDetails.userId': 1 });

// Index for order number lookups
orderSchema.index({ orderNumber: 1 });

// Marketing attribution analytics (sparse)
orderSchema.index(
    { 'marketingAttribution.normalized.source': 1, createdAt: -1 },
    { sparse: true }
);
orderSchema.index(
    { 'marketingAttribution.normalized.medium': 1, createdAt: -1 },
    { sparse: true }
);
orderSchema.index(
    { 'marketingAttribution.normalized.campaign': 1, createdAt: -1 },
    { sparse: true }
);
orderSchema.index(
    { 'marketingAttribution.normalized.channel': 1, createdAt: -1 },
    { sparse: true }
);
orderSchema.index({ 'marketingAttribution.clickIds.gclid': 1 }, { sparse: true });
orderSchema.index({ customerKey: 1, createdAt: -1 }, { sparse: true });

module.exports = mongoose.model('Order', orderSchema);

