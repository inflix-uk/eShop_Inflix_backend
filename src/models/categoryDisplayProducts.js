// models/categoryDisplayProducts.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categoryDisplayProductsSchema = new Schema({
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: 'productCategories',
        required: true
    },
    categoryName: {
        type: String,
        required: true
    },
    products: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        productName: {
            type: String
        },
        productUrl: {
            type: String
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure one document per category
categoryDisplayProductsSchema.index({ categoryId: 1 }, { unique: true });

const CategoryDisplayProducts = mongoose.model('CategoryDisplayProducts', categoryDisplayProductsSchema);

module.exports = CategoryDisplayProducts;
