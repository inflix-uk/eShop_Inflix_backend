/**
 * Clean Products Table Script
 * Run: node src/seeders/cleanProducts.js
 */
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://zextonsAdmin:12345@zextons.y1to4og.mongodb.net/zextonsnew';

async function cleanProducts() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Get the products collection
        const Product = mongoose.connection.collection('products');

        // Count before deletion
        const countBefore = await Product.countDocuments();
        console.log(`Products before deletion: ${countBefore}`);

        // Delete all products
        const result = await Product.deleteMany({});
        console.log(`Deleted ${result.deletedCount} products`);

        console.log('Products table cleaned successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error cleaning products:', error.message);
        process.exit(1);
    }
}

cleanProducts();
