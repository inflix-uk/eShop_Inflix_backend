const mongoose = require('../../connections/mongo');
const VariantAttribute = require('../models/VariantAttribute');

// Helper function to generate slug
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
};

// New attributes to add
const newAttributes = [
    {
        name: 'Comes With',
        slug: 'comes_with',
        description: 'Accessories included with the product',
        isActive: true,
        hasModels: false,
        values: [
            { name: 'Power Adapter', slug: 'power_adapter', icon: '<i class="fi fi-rr-plug"></i>', description: 'Original power adapter included', isActive: true },
            { name: 'Charging Cable', slug: 'charging_cable', icon: '<i class="fi fi-rr-usb-cable"></i>', description: 'USB charging cable included', isActive: true },
            { name: 'Protection Bundle', slug: 'protection_bundle', icon: '<i class="fi fi-rr-box-open"></i>', description: 'Screen protector and case included', isActive: true },
            { name: 'Tree Planted', slug: 'tree_planted', icon: '<i class="fi fi-rr-tree"></i>', description: 'A tree is planted with your purchase', isActive: true },
            { name: 'HDMI Cable', slug: 'hdmi_cable', icon: '<i class="fi fi-rr-computer"></i>', description: 'HDMI cable included', isActive: true },
            { name: 'Power Cable', slug: 'power_cable', icon: '<i class="fi fi-rr-bolt"></i>', description: 'Power cable included', isActive: true },
            { name: '1x Controller', slug: '1x_controller', icon: '<i class="fi fi-rr-gamepad"></i>', description: 'One controller included', isActive: true },
            { name: '2x Controller', slug: '2x_controller', icon: '<i class="fi fi-rr-gamepad"></i>', description: 'Two controllers included', isActive: true },
            { name: 'Free Sim', slug: 'free_sim', icon: '<i class="fi fi-rr-sim-card"></i>', description: 'Free SIM card included', isActive: true },
            { name: 'Screen Protector', slug: 'screen_protector', icon: '<i class="fi fi-rr-smartphone"></i>', description: 'Screen protector included', isActive: true },
            { name: 'Back Cover', slug: 'back_cover', icon: '<i class="fi fi-rr-mobile-cover"></i>', description: 'Back cover case included', isActive: true }
        ]
    },
    {
        name: 'Top Section',
        slug: 'top_section',
        description: 'Top section highlights for product page',
        isActive: true,
        hasModels: false,
        values: [
            { name: 'Free Delivery', slug: 'free_delivery', icon: '<i class="fi fi-rr-truck-side"></i>', description: 'Free delivery on this product', isActive: true },
            { name: 'Fast Shipping', slug: 'fast_shipping', icon: '<i class="fi fi-rr-rocket-lunch"></i>', description: 'Ships within 24 hours', isActive: true },
            { name: '30 Day Returns', slug: '30_day_returns', icon: '<i class="fi fi-rr-refresh"></i>', description: '30 day hassle-free returns', isActive: true },
            { name: 'Warranty Included', slug: 'warranty_included', icon: '<i class="fi fi-rr-shield-check"></i>', description: 'Warranty coverage included', isActive: true },
            { name: 'Certified Refurbished', slug: 'certified_refurbished', icon: '<i class="fi fi-rr-badge-check"></i>', description: 'Professionally refurbished', isActive: true },
            { name: 'Secure Payment', slug: 'secure_payment', icon: '<i class="fi fi-rr-lock"></i>', description: 'Safe and secure checkout', isActive: true },
            { name: '24/7 Support', slug: '24_7_support', icon: '<i class="fi fi-rr-headset"></i>', description: 'Round the clock customer support', isActive: true },
            { name: 'Best Price', slug: 'best_price', icon: '<i class="fi fi-rr-badge-dollar"></i>', description: 'Best price guaranteed', isActive: true },
            { name: 'Eco Friendly', slug: 'eco_friendly', icon: '<i class="fi fi-rr-leaf"></i>', description: 'Environmentally friendly product', isActive: true },
            { name: 'Gift Ready', slug: 'gift_ready', icon: '<i class="fi fi-rr-gift"></i>', description: 'Perfect for gifting', isActive: true }
        ]
    }
];

const addNewAttributes = async () => {
    try {
        // Wait for MongoDB connection
        await mongoose.connection;
        console.log('MongoDB connected...');

        for (const attr of newAttributes) {
            // Check if attribute already exists
            const existing = await VariantAttribute.findOne({ slug: attr.slug });

            if (existing) {
                console.log(`Attribute "${attr.name}" (${attr.slug}) already exists. Updating...`);
                await VariantAttribute.updateOne(
                    { slug: attr.slug },
                    { $set: attr }
                );
                console.log(`  - Updated "${attr.name}" with ${attr.values.length} values`);
            } else {
                console.log(`Creating new attribute "${attr.name}"...`);
                await VariantAttribute.create(attr);
                console.log(`  - Created "${attr.name}" (${attr.slug}) with ${attr.values.length} values`);
            }
        }

        console.log('\nSeeding completed successfully!');
        console.log('\nAttributes added/updated:');
        console.log('  - Comes With (comes_with): For product accessories');
        console.log('  - Top Section (top_section): For product page highlights');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

// Run the seeder
addNewAttributes();
