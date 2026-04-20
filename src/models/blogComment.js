// models/blogComment.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blogCommentSchema = new Schema({
    blog: {
        type: Schema.Types.ObjectId,
        ref: 'Blog' // Reference to the Blog model
    },
    userType: String,
    userId: Number,
    userIpAddress: String,
    userName: String,
    userEmail: String,
    userWebsite: String,
    comment: {
        type: String,
        required: true
    },
    parentComment: {
        type: Schema.Types.ObjectId,
        ref: 'BlogComment' // Reference to the parent comment
    },
    status: {
        type: Number,
        default: 2
    },
    previousStatus: Number,
    commentDate: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const BlogComment = mongoose.model('BlogComment', blogCommentSchema);

module.exports = BlogComment;
