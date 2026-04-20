const mongoose = require('mongoose');

// Schema for models (under brand values)
const modelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        lowercase: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { _id: true });

// Schema for individual values (used for brands, etc.)
const modelValueSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        lowercase: true
    },
    colorCode: {
        type: String,
        trim: true
    },
    icon: {
        type: String,
        default: null  // Predefined icon ID (e.g., 'powerAdapter', 'hdmiCable')
    },
    description: {
        type: String,
        trim: true,
        default: null
    },
    image: {
        filename: String,
        path: String,
        url: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    models: [modelSchema]
}, { _id: true });

// Generate SEO-friendly slug for value before saving (hyphen format)
modelValueSchema.pre('save', function(next) {
    if (this.isModified('name') || !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-+/g, '-');
    }
    next();
});

const variantAttributeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        unique: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    values: [modelValueSchema],
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    hasModels: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Generate SEO-friendly slug from name before saving (hyphen format)
variantAttributeSchema.pre('save', function(next) {
    if (this.isModified('name') || !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-+/g, '-');
    }
    next();
});

module.exports = mongoose.model('VariantAttribute', variantAttributeSchema);
