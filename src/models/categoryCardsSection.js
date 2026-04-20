// Singleton-style settings for the homepage "Popular Categories" block (heading + row styling)
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categoryCardsSectionSchema = new Schema({
    headingText: {
        type: String,
        default: 'Popular Categories',
        trim: true,
        maxlength: 120
    },
    headingColor: {
        type: String,
        default: '#15803d',
        trim: true
    },
    dividerColor: {
        type: String,
        default: '#000000',
        trim: true
    },
    sectionBackgroundColor: {
        type: String,
        default: '',
        trim: true
    }
}, {
    timestamps: true,
    collection: 'categorycardssections'
});

module.exports = mongoose.model('CategoryCardsSection', categoryCardsSectionSchema);
