// models/logo.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const logoSchema = new Schema({
    logoUrl: {
        type: String,
        default: null,
        trim: true
    },
    altText: {
        type: String,
        default: 'Logo',
        trim: true
    },
    faviconUrl: {
        type: String,
        default: null,
        trim: true
    }
}, {
    timestamps: true,
    collection: 'logo'
});

// Ensure only one logo document exists
logoSchema.statics.getLogo = async function() {
    let logo = await this.findOne();
    if (!logo) {
        logo = await this.create({
            logoUrl: null,
            altText: 'Logo',
            faviconUrl: null
        });
    }
    return logo;
};

module.exports = mongoose.model('Logo', logoSchema);
