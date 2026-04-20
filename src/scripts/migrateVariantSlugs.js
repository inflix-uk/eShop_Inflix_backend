/**
 * Migration Script: Add variantId and SEO-friendly slug to existing variants
 *
 * This script:
 * 1. Generates variantId (nanoid) for variants without one
 * 2. Generates SEO-friendly slug from variant name or attributes array
 * 3. Processes products in batches to avoid memory issues
 *
 * Usage:
 *   node src/scripts/migrateVariantSlugs.js
 *   node src/scripts/migrateVariantSlugs.js --dry-run  (preview changes without saving)
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Product = require('../models/product');
const { generateVariantId, variantNameToSeoSlug, generateVariantSlug } = require('../utils/slugUtils');

// Default MongoDB URI (same as connections/mongo.js)
const DEFAULT_MONGO_URI = 'mongodb+srv://zextonsAdmin:12345@zextons.y1to4og.mongodb.net/zextonsnew';

// Configuration
const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes('--dry-run');

// Stats tracking
const stats = {
    totalProducts: 0,
    productsProcessed: 0,
    productsUpdated: 0,
    variantsUpdated: 0,
    variantsSkipped: 0,
    errors: 0
};

/**
 * Connect to MongoDB
 */
async function connectDB() {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || DEFAULT_MONGO_URI;

    console.log('Connecting to MongoDB...');
    console.log(`URI: ${mongoURI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in log

    await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 10000
    });
    console.log(`Connected to MongoDB Database: ${mongoose.connection.name}\n`);
}

/**
 * Generate slug for a variant
 * Prefers attributes array, falls back to name conversion
 */
function generateSlugForVariant(variant) {
    // If variant has attributes array, use it for slug generation
    if (variant.attributes && Array.isArray(variant.attributes) && variant.attributes.length > 0) {
        return generateVariantSlug(variant.attributes);
    }

    // Fallback: convert name to SEO slug
    if (variant.name) {
        return variantNameToSeoSlug(variant.name);
    }

    return '';
}

/**
 * Process a single product
 */
async function processProduct(product) {
    let hasChanges = false;
    let variantsUpdated = 0;

    if (!product.variantValues || !Array.isArray(product.variantValues)) {
        return { hasChanges: false, variantsUpdated: 0 };
    }

    for (const variant of product.variantValues) {
        let variantChanged = false;

        // Generate variantId if missing
        if (!variant.variantId) {
            variant.variantId = generateVariantId();
            variantChanged = true;
        }

        // Generate slug if missing
        if (!variant.slug) {
            variant.slug = generateSlugForVariant(variant);
            variantChanged = true;
        }

        if (variantChanged) {
            hasChanges = true;
            variantsUpdated++;
        } else {
            stats.variantsSkipped++;
        }
    }

    return { hasChanges, variantsUpdated };
}

/**
 * Process products in batches
 */
async function migrateProducts() {
    // Get total count
    stats.totalProducts = await Product.countDocuments({ isdeleted: false });
    console.log(`Found ${stats.totalProducts} products to process\n`);

    if (stats.totalProducts === 0) {
        console.log('No products to migrate.');
        return;
    }

    let skip = 0;

    while (skip < stats.totalProducts) {
        const products = await Product.find({ isdeleted: false })
            .skip(skip)
            .limit(BATCH_SIZE);

        if (products.length === 0) break;

        console.log(`Processing batch ${Math.floor(skip / BATCH_SIZE) + 1} (${skip + 1}-${skip + products.length} of ${stats.totalProducts})...`);

        for (const product of products) {
            try {
                stats.productsProcessed++;
                const { hasChanges, variantsUpdated } = await processProduct(product);

                if (hasChanges) {
                    stats.productsUpdated++;
                    stats.variantsUpdated += variantsUpdated;

                    if (DRY_RUN) {
                        console.log(`  [DRY-RUN] Would update product: ${product.name} (${variantsUpdated} variants)`);
                        // Log first 3 variants as sample
                        product.variantValues.slice(0, 3).forEach(v => {
                            console.log(`    - ${v.name}`);
                            console.log(`      variantId: ${v.variantId}`);
                            console.log(`      slug: ${v.slug}`);
                        });
                        if (product.variantValues.length > 3) {
                            console.log(`    ... and ${product.variantValues.length - 3} more variants`);
                        }
                    } else {
                        await product.save();
                        console.log(`  Updated: ${product.name} (${variantsUpdated} variants)`);
                    }
                }
            } catch (error) {
                stats.errors++;
                console.error(`  Error processing product ${product._id}: ${error.message}`);
            }
        }

        skip += BATCH_SIZE;

        // Progress indicator
        const progress = Math.round((skip / stats.totalProducts) * 100);
        console.log(`Progress: ${Math.min(progress, 100)}%\n`);
    }
}

/**
 * Print summary
 */
function printSummary() {
    console.log('\n========================================');
    console.log('Migration Summary');
    console.log('========================================');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes saved)' : 'LIVE'}`);
    console.log(`Total products: ${stats.totalProducts}`);
    console.log(`Products processed: ${stats.productsProcessed}`);
    console.log(`Products updated: ${stats.productsUpdated}`);
    console.log(`Variants updated: ${stats.variantsUpdated}`);
    console.log(`Variants skipped (already had slug/id): ${stats.variantsSkipped}`);
    console.log(`Errors: ${stats.errors}`);
    console.log('========================================\n');

    if (DRY_RUN) {
        console.log('This was a dry run. Run without --dry-run to apply changes.');
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('========================================');
    console.log('Variant Slug Migration Script');
    console.log('========================================\n');

    if (DRY_RUN) {
        console.log('DRY RUN MODE - No changes will be saved\n');
    }

    try {
        await connectDB();
        await migrateProducts();
        printSummary();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

main();
