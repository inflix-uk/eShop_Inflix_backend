const mongoose = require('mongoose');

const categoryBrandSchema = new mongoose.Schema({
    categoryBrandName: {
        type: String,
        required: [true, 'category Brand name is required'],
        trim: true
    },
    order: {
        type: Number,
        default: 0
    },
    categoryBrandLogo: {
        type: String,
        required: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isPublish: {
        type: Boolean,
        default: false
    },
    categoryBrandLogoAlt: {
        type: String,
        trim: true
    },
    categoryBrandPageTitle: {
        type: String,
        required: [true, 'Page title is required'],
        trim: true
    },
    categoryBrandPageDescription: {
        type: String,
        trim: true
    },
    categoryBrandMetaTitle: {
        type: String,
        trim: true
    },
    categoryBrandMetaKeywords: {
        type: String,
        trim: true
    },
    categoryBrandMetaDescription: {
        type: String,
        trim: true
    },
    categoryBrandMetaSchemas: [{
        type: String 
    }],
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    brandCategoryUrl: {
        type: String,
        default: null
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    versionKey: false
});

// Middleware to update `updatedAt` before saving
categoryBrandSchema.pre('save', async function (next) {
    this.updatedAt = Date.now();
    // Only set order if this is a new document and order is not manually set
    if (this.isNew && (this.order === undefined || this.order === null)) {
        try {
            const maxOrderCategory = await this.constructor.findOne().sort('-order').select('order').lean();
            this.order = maxOrderCategory && typeof maxOrderCategory.order === 'number' ? maxOrderCategory.order + 1 : 0;
        } catch (err) {
            // If error, fallback to 0
            this.order = 0;
        }
    }
    next();
});

const CategoryBrand = mongoose.model('CategoryBrand', categoryBrandSchema);
module.exports = CategoryBrand;
