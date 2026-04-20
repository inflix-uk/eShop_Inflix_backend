// models/product.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const relatedProductSchema = new Schema({
    relatedProductId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    relatedProductName: {
        type: String,
        required: true
    },
    relatedProductImage: {
        type: String,
        default: null
    },
    relatedProductBrand: {
        type: String,
        default: null
    },
    relatedProductCondition: {
        type: String,
        default: null
    },
    order: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const productSchema = new Schema({
    name: {
        type: String
        // required: true
    },
    producturl: {
        type: String,
        default: null,
        index: true,
        unique: true
    },
    category: {
        type: String,
        default: null
    },
    subCategory: {
        type: String,
        default: null
    },
    brand: {
        type: String,
        default: null
    },
    relatedProducts: [relatedProductSchema],
    battery: [{
          type: String,
          default: null
      }],
    condition: {
        type: String,
        default: null
    },
    tags: {
        type: String,
        default: null
    },

    is_featured: {
        type: Boolean,
        default: null
    },
    seeAccessoriesWeDontNeed: {
        type: Boolean,
        default: null
    },
    perks_and_benefits: {
        status: {
            type: Boolean,
            default: false
        },
        description: {
            type: String,
            default: null
        },
        image: {
            filename: String,
            path: String,
            url: String
        }
    },
    topsection: [{
        name: {
            type: String,
            default: null
        },
        description: {
            type: String,
            default: null
        },
        image: {
            filename: String,
            path: String,
            url: String
        }
    }],

    // Comes With: Array of selected item slugs from VariantAttribute system (slug: 'comes_with')
    // Each slug references a value in the "Comes With" VariantAttribute
    comesWithItems: [{
        type: String
    }],

    // Top Section: Array of selected item slugs from VariantAttribute system (slug: 'top_section')
    // Each slug references a value in the "Top Section" VariantAttribute
    topSectionItems: [{
        type: String
    }],

    is_refundable: {
        status: {
            type: Boolean,
            default: null
        },
        refund_duration: {
            type: Number,
            default: null
        },
        refund_type: {
            type: String,
            default: null
        }
    },

    is_authenticated: {
        type: Boolean,
        default: null
    },
    low_stock_quantity_alert: {
        type: Number,
        default: null
    },

    sim_options: {
        type: String,
        default: null
    },

    // Select Option: Single selected slug from VariantAttribute system (slug: 'select_options')
    selectOption: {
        type: String,
        default: null
    },

    product_Specifications :[],
    variantDescription :[],

    thumbnail_image: {
        filename: String,
        path: String,
        url: String,
        altText: { type: String, default: '' },
        description: { type: String, default: '' }
    },

    Gallery_Images: [{
        filename: String,
        path: String,
        url: String,
        altText: { type: String, default: '' },
        description: { type: String, default: '' }
    }],


    has_warranty: {
        status: {
            type: Boolean,
            default: null
        },
        has_replacement_warranty: {
            type: Boolean,
            default: null
        },
        Warranty_duration: {
            type: Number,
            default: null
        },
        Warranty_type: {
            type: String,
            default: null
        }

    },

    productType: {
        type: {
            type: String,
            default: null
        }
    },

    variantValues: [{
        name: String,
        // Unique variant identifier for reliable lookups
        variantId: { type: String, index: true, sparse: true },
        // SEO-friendly slug (hyphen-only format)
        slug: { type: String, index: true, sparse: true },
        // Structured breakdown of attributes for queries
        attributes: [{
            attributeName: String,
            attributeSlug: String,
            value: String,
            valueSlug: String,
            colorCode: String,
            model: {
                name: String,
                slug: String
            }
        }],
        variantImages: [],
        Cost: Number,
        Price: Number,
        Quantity: Number,
        SKU: String,
        EIN: String,
        MPN: String,
        salePrice: String,
        metaTitle: String,
        metaKeywords: String,
        metaSchemas: [String],
        metaImage: {
            filename: String,
            path: String,
            url: String
        },
        metaDescription: String,
        status: {
            type: Boolean,
            default: true
        }
    }],

    // Enhanced variantNames with attribute reference
    variantNames: [{
        name: String,
        attributeId: {
            type: Schema.Types.ObjectId,
            ref: 'VariantAttribute'
        },
        attributeSlug: String,
        hasModels: {
            type: Boolean,
            default: false
        },
        options: [{
            value: String,
            slug: String,
            colorCode: String,
            model: {
                name: String,
                slug: String
            }
        }]
    }],

    // Enhanced varImgGroup with attribute references
    varImgGroup: [{
        name: String,
        attributeSlug: String,
        valueSlug: String,
        varImg: []
    }],

  

    Product_summary: {
        type: String,
        default: null
    },
    Product_description: {
        type: String,
        default: null
    },
    /** Homepage-style row/column block JSON (same shape as admin BlockEditor). */
    Product_description_blocks: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    Seo_Meta: {
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
        }
    },
    meta_Image: {
        filename: String,
        path: String,
        url: String
    },

    status: {
        type: Boolean,
        default: null
    },
    rating: {
        type: Number,
        default: '0.0'
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

// Define indexes
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ status: 1, brand: 1, createdAt: -1 }); // Optimized for brand filtering with sort
productSchema.index({ name: 'text', category: 'text', subCategory: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ subCategory: 1, status: 1 });
productSchema.index({ brand: 1, status: 1 });
productSchema.index({ is_featured: 1, status: 1 });
productSchema.index({ condition: 1, status: 1 });

// Variant attribute indexes for dynamic variant system
productSchema.index({ 'variantNames.attributeSlug': 1 });
productSchema.index({ 'variantValues.attributes.attributeSlug': 1 });
productSchema.index({ 'variantValues.SKU': 1 }, { sparse: true });
productSchema.index({ 'variantValues.Quantity': 1 });

module.exports = mongoose.model('Product', productSchema);