// models/blog.js
const mongoose = require('mongoose');
const BlogTag = require('./blogTags');
const Schema = mongoose.Schema;

const blogSchema = new Schema({
    name: {
        type: String
        // required: true
    },

    permalink: String,
    // blogImage: String,
    blogImage: String,
    blogImageAlt: String,   
    blogShortDescription: String,
    thumbnailImage: String,
    blogthumbnailImageAlt: String,
    metaTitle: String,
    metaImage: String,
    metaImageAlt: String,
    metakeywords: String,
    blogpublisheddate: String,
    metaschemas: [String],
    metaDescription: String,
    shortDescription: String,
    content: String,
    content1: String,
    selectedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    }],
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User' // Refers to the User model
        // required: true
    },

    blogTags: [String],

    //     type: Schema.Types.ObjectId,
    //     ref: 'BlogTag' // Refers to the BlogTag model
    // }],
    blogCategory: {
        type: String,
        default: null
    },
    visibility: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: null
    },
    visibility: {
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
    },
    deletedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Blog', blogSchema);
