/**
 * Script to create database indexes for performance optimization
 * Run this once after deployment or when schemas change
 *
 * Usage: node scripts/createIndexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models (indexes are defined in schemas)
const Device = require('../models/device');
const Brand = require('../models/brand');
const CategoryBrand = require('../models/categoryBrand');

async function createIndexes() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zextons');
        console.log('✅ Connected to MongoDB\n');

        console.log('📊 Creating indexes for Device model...');
        await Device.createIndexes();
        console.log('✅ Device indexes created');

        console.log('📊 Creating indexes for Brand model...');
        await Brand.createIndexes();
        console.log('✅ Brand indexes created');

        console.log('📊 Creating indexes for CategoryBrand model...');
        await CategoryBrand.createIndexes();
        console.log('✅ CategoryBrand indexes created');

        console.log('\n🎉 All indexes created successfully!');
        console.log('\n📋 Index Summary:');

        // Show all indexes
        const deviceIndexes = await Device.collection.getIndexes();
        const brandIndexes = await Brand.collection.getIndexes();
        const categoryIndexes = await CategoryBrand.collection.getIndexes();

        console.log('\n📌 Device Indexes:');
        Object.keys(deviceIndexes).forEach(key => {
            console.log(`   - ${key}: ${JSON.stringify(deviceIndexes[key].key)}`);
        });

        console.log('\n📌 Brand Indexes:');
        Object.keys(brandIndexes).forEach(key => {
            console.log(`   - ${key}: ${JSON.stringify(brandIndexes[key].key)}`);
        });

        console.log('\n📌 CategoryBrand Indexes:');
        Object.keys(categoryIndexes).forEach(key => {
            console.log(`   - ${key}: ${JSON.stringify(categoryIndexes[key].key)}`);
        });

        console.log('\n✅ Done! You can now close this script.');

    } catch (error) {
        console.error('❌ Error creating indexes:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
    }
}

// Run the script
createIndexes();
