// models/siteMetaTags.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const siteMetaTagsSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ['google_search_console', 'bing_webmaster', 'yandex_verification', 'other'],
        index: true
    },
    metaTagName: {
        type: String,
        required: true,
        trim: true
    },
    metaTagContent: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
        default: null
    }
}, {
    timestamps: true,
    collection: 'sitemetatags'
});

// Index for efficient queries
siteMetaTagsSchema.index({ type: 1, isActive: 1 });

// Ensure only one active meta tag per type
siteMetaTagsSchema.pre('save', async function(next) {
    if (this.isActive && this.isNew) {
        // Deactivate other meta tags of the same type
        await mongoose.model('SiteMetaTags').updateMany(
            { type: this.type, _id: { $ne: this._id } },
            { isActive: false }
        );
    }
    next();
});

module.exports = mongoose.model('SiteMetaTags', siteMetaTagsSchema);
