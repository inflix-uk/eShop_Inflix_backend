// models/productCategories.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

function sanitizeSlug(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}

// Define the metasubCategory schema that links metadata to a specific subcategory
const metaSubCategorySchema = new Schema({
    subcategoryName: {
        type: String,
        required: null
    },
    subCategoryIndex: {
        type: Number,
        required: true 
    },
    metaTitle: {
        type: String,
        default: null
    },
    metaDescription: {
        type: String,
        default: null
    },
    metaKeywords: {
        type: String,
        default: null
    },
    metaSchemas: {
        type: [String],
        default: []
    },
    content: {
        type: String,
        default: null
    },
    /** Homepage-style block rows for this subcategory page */
    content_blocks: {
        type: Schema.Types.Mixed,
        default: [],
    },
    banner: {
        filename: String,
        path: String,
        url: String
    }
});

const productCategoriesSchema = new Schema({
    storeId: {
        type: Schema.Types.ObjectId,
        ref: 'Store',
        index: true,
        default: null
    },
    name: {
        type: String
        // required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    subCategory: [String],
    metasubCategory: [metaSubCategorySchema],

    Logo: {
        filename: String,
        path: String,
        url: String
    },
    metaTitle: {
        type: String
    },
    metaImage: {
        filename: String,
        path: String,
        url: String
    },
    bannerImage: {
        filename: String,
        path: String,
        url: String
    },
    metaSchemas: [String],
    metaKeywords: {
        type: String,
        default: null
    },
    content: {
        type: String,
        default: null
    },
    /** Homepage-style block rows (text, image, widgets, etc.) */
    content_blocks: {
        type: Schema.Types.Mixed,
        default: [],
    },
    
    metaDescription: {
        type: String
    },
    isPublish: {
        type: Boolean,
        default: null
    },
    isFeatured: {
        type: Boolean,
        default: null
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

productCategoriesSchema.pre("validate", async function (next) {
    try {
        const source = this.slug || this.name || "";
        let baseSlug = sanitizeSlug(source);

        if (!baseSlug) {
            baseSlug = `category-${Date.now()}`;
        }

        let candidate = baseSlug;
        let suffix = 1;

        while (true) {
            const existing = await this.constructor.findOne({
                slug: candidate,
                _id: { $ne: this._id }
            }).select("_id");

            if (!existing) break;
            candidate = `${baseSlug}-${suffix++}`;
        }

        this.slug = candidate;
        next();
    } catch (error) {
        next(error);
    }
});

const productCategories = mongoose.model('productCategories', productCategoriesSchema);

module.exports = productCategories;
