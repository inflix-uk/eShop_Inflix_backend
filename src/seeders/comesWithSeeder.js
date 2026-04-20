const mongoose = require('../../connections/mongo');
const VariantAttribute = require('../models/VariantAttribute');

// Helper function to generate slug
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
};

// "Comes With" accessory items with predefined icon IDs
// Icons map to AVAILABLE_ICONS in ProductComesWith.jsx (frontend)
const comesWithData = {
    name: 'Comes With',
    slug: 'comes_with',
    description: 'Accessories and items included with products',
    isActive: true,
    hasModels: false,
    values: [
        { name: 'Power Adapter', slug: 'power_adapter', icon: 'powerAdapter', description: 'Original power adapter included', isActive: true },
        { name: 'Charging Cable', slug: 'charging_cable', icon: 'chargingCable', description: 'USB charging cable included', isActive: true },
        { name: 'Protection Bundle', slug: 'protection_bundle', icon: 'protectionBundle', description: 'Screen protector and case bundle', isActive: true },
        { name: 'Tree Planted', slug: 'tree_planted', icon: 'treePlanted', description: 'We plant a tree for every purchase', isActive: true },
        { name: 'HDMI Cable', slug: 'hdmi_cable', icon: 'hdmiCable', description: 'HDMI cable for display connection', isActive: true },
        { name: 'Power Cable', slug: 'power_cable', icon: 'powerCableNew', description: 'Power cable for device', isActive: true },
        { name: '1x Controller', slug: '1x_controller', icon: 'onexController', description: 'One wireless controller included', isActive: true },
        { name: '2x Controller', slug: '2x_controller', icon: 'twoxController', description: 'Two wireless controllers included', isActive: true },
        { name: 'Free Sim', slug: 'free_sim', icon: 'freeSim', description: 'Free SIM card included', isActive: true },
        { name: 'Screen Protector', slug: 'screen_protector', icon: 'screenProtector', description: 'Tempered glass screen protector', isActive: true },
        { name: 'Back Cover', slug: 'back_cover', icon: 'backCover', description: 'Protective back cover case', isActive: true }
    ]
};

const seedComesWithAttribute = async () => {
    try {
        // Wait for MongoDB connection
        await mongoose.connection;
        console.log('MongoDB connected...');

        // Check if "Comes With" attribute already exists
        const existingAttribute = await VariantAttribute.findOne({ slug: 'comes_with' });

        if (existingAttribute) {
            console.log('Comes With attribute already exists. Updating values...');

            // Update existing attribute with new values
            existingAttribute.values = comesWithData.values;
            existingAttribute.description = comesWithData.description;
            existingAttribute.isActive = comesWithData.isActive;
            existingAttribute.hasModels = comesWithData.hasModels;

            await existingAttribute.save();
            console.log('Updated Comes With attribute successfully!');
            console.log(`  - ${existingAttribute.name} (${existingAttribute.slug}): ${existingAttribute.values.length} values`);
        } else {
            console.log('Creating new Comes With attribute...');

            // Create new attribute
            const result = await VariantAttribute.create(comesWithData);
            console.log('Created Comes With attribute successfully!');
            console.log(`  - ${result.name} (${result.slug}): ${result.values.length} values`);
        }

        // Display the values
        console.log('\nComes With items:');
        comesWithData.values.forEach(item => {
            console.log(`  - ${item.name} (icon: ${item.icon})`);
        });

        console.log('\nSeeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

// Run the seeder
seedComesWithAttribute();
