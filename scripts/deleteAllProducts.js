/**
 * Script to delete all products from the database
 *
 * Usage:
 *   node scripts/deleteAllProducts.js          (with confirmation)
 *   node scripts/deleteAllProducts.js --force  (skip confirmation)
 *
 * WARNING: This will permanently delete ALL products!
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://zextonsAdmin:12345@zextons.y1to4og.mongodb.net/zextonsnew';

// Product model
const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model('Product', productSchema, 'products');

// Check for --force flag
const forceDelete = process.argv.includes('--force');

async function deleteAllProducts() {
  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Count products
    const count = await Product.countDocuments();
    console.log(`📦 Found ${count} products in the database\n`);

    if (count === 0) {
      console.log('ℹ️  No products to delete.');
      await mongoose.disconnect();
      process.exit(0);
    }

    if (forceDelete) {
      console.log('🗑️  Deleting all products (--force mode)...');
      const result = await Product.deleteMany({});
      console.log(`\n✅ Successfully deleted ${result.deletedCount} products!`);
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB\n');
      process.exit(0);
    } else {
      // Interactive mode
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(`⚠️  Are you sure you want to delete ALL ${count} products? (yes/no): `, async (answer) => {
        if (answer.toLowerCase() === 'yes') {
          console.log('\n🗑️  Deleting all products...');
          const result = await Product.deleteMany({});
          console.log(`\n✅ Successfully deleted ${result.deletedCount} products!`);
        } else {
          console.log('\n❌ Operation cancelled.');
        }

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB\n');
        rl.close();
        process.exit(0);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
deleteAllProducts();
