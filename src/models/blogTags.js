// models/blogTags.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blogTagSchema = new Schema({
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

    metaDescription: String,
    isPublish: {
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

const BlogTag = mongoose.model('BlogTag', blogTagSchema);

module.exports = BlogTag;
