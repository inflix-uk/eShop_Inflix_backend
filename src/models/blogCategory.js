// models/blogCategory.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blogCategorySchema = new Schema({
    name: {
        type: String
        // required: true
    },
    shortDescription: String,
    metaTitle: String,
    metaImage: {
        filename: String,
        path: String
    },
    bannerImage: {
        filename: String,
        path: String
    },
    metaDescription: String,
    isFeatured: Boolean,
    isPublish: Boolean,
    createdAt: Date,
    updatedAt: Date
});

blogCategorySchema.index({ parent: 1 }); // Index on the 'parent' field for efficient querying

module.exports = mongoose.model('BlogCategory', blogCategorySchema);
