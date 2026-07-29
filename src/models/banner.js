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
    /** `image` = photo background; `video` = looping video behind text */
    backgroundMedia: {
        type: String,
        enum: ['image', 'video'],
        default: 'image',
        index: true
    },
    imageLarge: {
        type: String,
        default: ''
    },
    imageSmall: {
        type: String,
        default: ''
    },
    /** Admin-defined hero image dimensions (px) — upload + storefront use these sizes */
    imageLargeWidthPx: { type: Number, default: 1200 },
    imageLargeHeightPx: { type: Number, default: 417 },
    imageSmallWidthPx: { type: Number, default: 1080 },
    imageSmallHeightPx: { type: Number, default: 1920 },
    videoLarge: {
        type: String,
        default: null
    },
    videoSmall: {
        type: String,
        default: null
    },
    /** Tint over video (hex) */
    overlayColor: {
        type: String,
        trim: true,
        default: '#000000'
    },
    /** 0–100 — darkness of overlay on video */
    overlayOpacity: {
        type: Number,
        default: 35,
        min: 0,
        max: 100
    },
    /** Video crop frame: hero | 16:9 | 21:9 | 4:3 | 9:16 | custom */
    videoDesktopLayout: {
        type: String,
        default: 'hero',
        trim: true
    },
    videoDesktopWidthPx: { type: Number, default: null },
    videoDesktopHeightPx: { type: Number, default: null },
    videoMobileLayout: {
        type: String,
        default: 'hero',
        trim: true
    },
    videoMobileWidthPx: { type: Number, default: null },
    videoMobileHeightPx: { type: Number, default: null },
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
        /** Layout style: "default" = current layout, "podcast" = podcast studio style */
        layoutStyle: {
            type: String,
            trim: true,
            enum: ['default', 'podcast'],
            default: 'default'
        },
        // === DEFAULT LAYOUT FIELDS ===
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
        },
        // === PODCAST LAYOUT FIELDS ===
        /** Main heading e.g. "Podcast Studio" */
        heading: {
            type: String,
            trim: true
        },
        /** Accent word shown in highlight color e.g. "Manchester" */
        headingAccent: {
            type: String,
            trim: true
        },
        /** Color for the accent word */
        headingAccentColor: {
            type: String,
            trim: true,
            default: '#C2FC12'
        },
        /** Tagline below heading e.g. "A premium content creation space by Two Minds Studio." */
        tagline: {
            type: String,
            trim: true
        },
        /** Longer description paragraph */
        description: {
            type: String,
            trim: true
        },
        /** CTA button text e.g. "Book Your Session" */
        ctaText: {
            type: String,
            trim: true
        },
        /** CTA button link */
        ctaLink: {
            type: String,
            trim: true
        },
        /** CTA button icon (flaticon class) e.g. "fi-rr-calendar" */
        ctaIcon: {
            type: String,
            trim: true
        },
        /** CTA button background color */
        ctaButtonColor: {
            type: String,
            trim: true,
            default: '#C2FC12'
        },
        /** CTA button text color */
        ctaButtonTextColor: {
            type: String,
            trim: true,
            default: '#000000'
        },
        /** Feature cards shown at bottom of podcast layout */
        featureCards: [{
            icon: { type: String, trim: true },
            title: { type: String, trim: true },
            text: { type: String, trim: true }
        }]
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
// Public hero query is find({ isActive: true, isDeleted: false }).sort({ order: 1 }).
// This compound fully covers both equality filters + the sort (no in-memory sort).
bannerSchema.index({ isActive: 1, isDeleted: 1, order: 1 });

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
