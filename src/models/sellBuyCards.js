// models/sellBuyCards.js - Singleton: one record per collection
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cardSubSchema = new Schema({
    heading: { type: String, required: true, trim: true },
    paragraph: { type: String, required: true, trim: true },
    buttonName: { type: String, required: true, trim: true },
    buttonLink: { type: String, required: true, trim: true },
    backgroundImage: { type: String, required: true, trim: true },
    productImage: { type: String, default: null, trim: true }
}, { _id: false });

const sellBuyCardsSchema = new Schema({
    sellCard: { type: cardSubSchema, required: true },
    buyCard: { type: cardSubSchema, required: true }
}, { timestamps: true, collection: 'sellbuycards' });

module.exports = mongoose.model('SellBuyCards', sellBuyCardsSchema);
