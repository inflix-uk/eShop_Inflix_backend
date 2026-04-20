// models/buyNowPayLater.js - Singleton: one record per collection
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const buyNowPayLaterSchema = new Schema({
    heading: { type: String, required: true, trim: true },
    paragraph: { type: String, required: true, trim: true },
    backgroundImage: { type: String, required: true, trim: true },
    paymentImages: [{ type: String, trim: true }] // up to 3
}, { timestamps: true, collection: 'buynowpaylater' });

module.exports = mongoose.model('BuyNowPayLater', buyNowPayLaterSchema);
