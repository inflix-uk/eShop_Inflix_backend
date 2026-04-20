const mongoose = require('../../connections/mongo');
const VariantAttribute = require('../models/VariantAttribute');

const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
};

const conditionData = {
    name: 'Condition',
    slug: 'condition',
    values: [
        { name: 'Brand New', slug: 'brand_new', isActive: true },
        { name: 'Refurbished', slug: 'refurbished', isActive: true },
        { name: 'Like New', slug: 'like_new', isActive: true },
        { name: 'Good', slug: 'good', isActive: true },
        { name: 'Fair', slug: 'fair', isActive: true },
        { name: 'Open Box', slug: 'open_box', isActive: true },
        { name: 'Used', slug: 'used', isActive: true }
    ],
    description: 'Product condition status',
    isActive: true,
    hasModels: false
};

const addConditionAttribute = async () => {
    try {
        console.log('Connecting to MongoDB...');

        // Check if condition attribute already exists
        const existing = await VariantAttribute.findOne({ slug: 'condition' });

        if (existing) {
            console.log('Condition attribute already exists. Updating...');
            await VariantAttribute.findByIdAndUpdate(existing._id, conditionData);
            console.log('Condition attribute updated successfully!');
        } else {
            console.log('Creating new Condition attribute...');
            const result = await VariantAttribute.create(conditionData);
            console.log('Condition attribute created successfully!');
            console.log(`  - ${result.name} (${result.slug}): ${result.values.length} values`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

addConditionAttribute();
