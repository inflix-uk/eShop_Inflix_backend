// models/productCategories.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
    banner: {
        filename: String,
        path: String,
        url: String
    }
});

const productCategoriesSchema = new Schema({
    name: {
        type: String
        // required: true
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

const productCategories = mongoose.model('productCategories', productCategoriesSchema);

module.exports = productCategories;
