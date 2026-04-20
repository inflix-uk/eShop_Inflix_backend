// models/categoryCard.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categoryCardSchema = new Schema({
    categoryName: {
        type: String,
        required: true,
        trim: true
    },
    shopNowLink: {
        type: String,
        required: true,
        trim: true
    },
    itemCount: {
        type: Number,
        default: 0,
        min: 0
    },
    /** Optional; card can use overlay / category image only. */
    backgroundImage: {
        type: String,
        required: false,
        default: null,
        trim: true
    },
    categoryImage: {
        type: String,
        required: false,
        trim: true
    },
    categoryNameColor: {
        type: String,
        default: '#000000',
        trim: true
    },
    itemCountColor: {
        type: String,
        default: '#6B7280',
        trim: true
    },
    /** Solid or rgba overlay on top of background image (empty = none) */
    overlayColor: {
        type: String,
        default: '',
        trim: true
    },
    order: {
        type: Number,
        default: 0,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true,
    collection: 'categorycards',
    toJSON: {
        transform(doc, ret) {
            if (ret.itemCount === undefined) ret.itemCount = 0;
            return ret;
        }
    }
});

categoryCardSchema.index({ order: 1, isActive: 1 });
categoryCardSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('CategoryCard', categoryCardSchema);
