// models/tinyPhoneBanner.js - Singleton: one record per collection
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tinyPhoneBannerSchema = new Schema({
    heading: { type: String, required: true, trim: true },
    paragraph: { type: String, required: true, trim: true },
    buttonName: { type: String, required: true, trim: true },
    buttonLink: { type: String, required: true, trim: true },
    backgroundImage: { type: String, required: true, trim: true },
    centerImage: { type: String, default: null, trim: true },
    rightImage: { type: String, default: null, trim: true }
}, { timestamps: true, collection: 'tinyphonebanner' });

module.exports = mongoose.model('TinyPhoneBanner', tinyPhoneBannerSchema);
