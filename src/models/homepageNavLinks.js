const mongoose = require('mongoose');

const navLinkSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    path: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    }
}, { _id: false });

/** Singleton document: quick links shown on the home page above homepage content */
const homepageNavLinksSchema = new mongoose.Schema({
    links: {
        type: [navLinkSchema],
        default: []
    }
}, {
    timestamps: true,
    collection: 'homepagenavlinks'
});

module.exports = mongoose.model('HomepageNavLinks', homepageNavLinksSchema);
