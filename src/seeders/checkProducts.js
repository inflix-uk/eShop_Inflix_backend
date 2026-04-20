const mongoose = require('../../connections/mongo');
const Product = require('../models/product');

const checkProducts = async () => {
    try {
        console.log('Connecting to MongoDB...');

        // Wait a moment for connection
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get all products
        const products = await Product.find({})
            .select('_id name brand status isdeleted createdAt')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        console.log('\n=== PRODUCTS IN DATABASE ===');
        console.log('Total products found:', products.length);
        console.log('');

        if (products.length === 0) {
            console.log('No products found in database!');
        } else {
            products.forEach((product, index) => {
                console.log(`[${index + 1}] ID: ${product._id}`);
                console.log(`    Name: ${product.name}`);
                console.log(`    Brand: ${product.brand}`);
                console.log(`    Status: ${product.status}`);
                console.log(`    Deleted: ${product.isdeleted}`);
                console.log(`    Created: ${product.createdAt}`);
                console.log('');
            });
        }

        // Also get count by brand
        const brandCounts = await Product.aggregate([
            { $match: { isdeleted: { $ne: true } } },
            { $group: { _id: '$brand', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        console.log('\n=== PRODUCTS BY BRAND ===');
        brandCounts.forEach(item => {
            console.log(`${item._id || 'No Brand'}: ${item.count} products`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkProducts();
