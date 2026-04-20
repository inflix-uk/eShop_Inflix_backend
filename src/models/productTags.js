// models/productTags.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for the product tag
const productTagSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    isPublished: {
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

// Create the Mongoose model using the defined schema
const ProductTag = mongoose.model('ProductTag', productTagSchema);

module.exports = ProductTag;
