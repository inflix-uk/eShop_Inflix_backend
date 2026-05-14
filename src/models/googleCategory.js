const mongoose = require('mongoose');

const googleCategorySchema = new mongoose.Schema({
    googleId: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    fullPath: {
        type: String,
        required: true,
        trim: true
    },
    pathLevels: [{
        type: String,
        trim: true
    }],
    level: {
        type: Number,
        required: true,
        index: true
    },
    parentGoogleId: {
        type: Number,
        default: null,
        index: true
    },
    isLeaf: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    note: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true,
    versionKey: false,
    collection: 'googleCategories'
});

googleCategorySchema.index({ fullPath: 'text', name: 'text' });

const GoogleCategory = mongoose.model('GoogleCategory', googleCategorySchema);
module.exports = GoogleCategory;
