// models/banner.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bannerSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ['simple', 'full'],
        index: true
    },
    order: {
        type: Number,
        required: true,
        default: 0,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    imageLarge: {
        type: String,
        required: true
    },
    imageSmall: {
        type: String,
        required: true
    },
    altText: {
        type: String,
        required: true,
        trim: true
    },
    // Simple type fields
    buttonText: {
        type: String,
        trim: true
    },
    buttonLink: {
        type: String,
        trim: true
    },
    // Full type fields
    content: {
        title: {
            type: String,
            trim: true
        },
        subtitle: {
            type: String,
            trim: true
        },
        paragraph: {
            type: String,
            trim: true
        },
        price: {
            type: String,
            trim: true
        },
        warranty: [{
            type: String,
            trim: true
        }],
        buynow: {
            type: String,
            trim: true
        },
        sellnow: {
            type: String,
            trim: true
        },
        // Text color customization fields (optional)
        titleColor: {
            type: String,
            trim: true,
            default: '#FFFFFF'
        },
        subtitleColor: {
            type: String,
            trim: true,
            default: '#FFFFFF'
        },
        paragraphColor: {
            type: String,
            trim: true,
            default: '#FFFFFF'
        },
        priceColor: {
            type: String,
            trim: true,
            default: '#FF0000'
        },
        // Text font size customization fields (optional)
        titleSize: {
            type: String,
            trim: true,
            default: '24px'
        },
        subtitleSize: {
            type: String,
            trim: true,
            default: '32px'
        },
        paragraphSize: {
            type: String,
            trim: true,
            default: '18px'
        },
        priceSize: {
            type: String,
            trim: true,
            default: '20px'
        },
        textAlign: {
            type: String,
            trim: true,
            enum: ['left', 'center', 'right'],
            default: 'left'
        },
        textPosition: {
            type: String,
            trim: true,
            enum: ['left', 'center', 'right'],
            default: 'right'
        }
    },
    extraImage: {
        type: String,
        default: null
    },
    // Metadata
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'banners'
});

// Indexes for better query performance
bannerSchema.index({ type: 1, isActive: 1, order: 1 });
bannerSchema.index({ isActive: 1, order: 1 });
bannerSchema.index({ isDeleted: 1, isActive: 1 });

// Pre-save middleware to auto-increment order if not provided
bannerSchema.pre('save', async function(next) {
    if (this.isNew && (this.order === undefined || this.order === null)) {
        try {
            const BannerModel = this.constructor;
            const maxOrder = await BannerModel.findOne({ isDeleted: false })
                .sort({ order: -1 })
                .select('order')
                .lean();
            this.order = maxOrder ? maxOrder.order + 1 : 1;
        } catch (error) {
            console.error('Error auto-incrementing order:', error);
            this.order = 1;
        }
    }
    next();
});

// Virtual for full image URLs (if needed)
bannerSchema.virtual('imageLargeUrl').get(function() {
    if (this.imageLarge && !this.imageLarge.startsWith('http')) {
        return this.imageLarge.startsWith('/') ? this.imageLarge : `/${this.imageLarge}`;
    }
    return this.imageLarge;
});

bannerSchema.virtual('imageSmallUrl').get(function() {
    if (this.imageSmall && !this.imageSmall.startsWith('http')) {
        return this.imageSmall.startsWith('/') ? this.imageSmall : `/${this.imageSmall}`;
    }
    return this.imageSmall;
});

bannerSchema.virtual('extraImageUrl').get(function() {
    if (this.extraImage && !this.extraImage.startsWith('http')) {
        return this.extraImage.startsWith('/') ? this.extraImage : `/${this.extraImage}`;
    }
    return this.extraImage;
});

module.exports = mongoose.model('Banner', bannerSchema);
