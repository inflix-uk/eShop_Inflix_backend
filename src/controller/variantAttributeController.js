const VariantAttribute = require('../models/VariantAttribute');
const Product = require('../models/product');

// Get all active variant attributes (for product creation)
const getActiveVariantAttributes = async (req, res) => {
    try {
        const variantAttributes = await VariantAttribute.find({ isActive: true, isDeleted: { $ne: true } })
            .select('name slug values hasModels description')
            .sort({ name: 1 });

        // Filter active and non-deleted values and models only
        const filtered = variantAttributes.map(attr => {
            const attrObj = attr.toObject();
            return {
                ...attrObj,
                values: (attrObj.values || [])
                    .filter(v => v.isActive !== false && v.isDeleted !== true) // Include values where isActive is true and not deleted
                    .map(v => ({
                        _id: v._id,
                        name: v.name,
                        slug: v.slug,
                        colorCode: v.colorCode || null,
                        isActive: v.isActive,
                        models: (v.models || [])
                            .filter(m => m.isActive !== false && m.isDeleted !== true)
                            .map(m => ({
                                _id: m._id,
                                name: m.name,
                                slug: m.slug,
                                isActive: m.isActive
                            }))
                    }))
            };
        });

        res.status(200).json({
            status: 200,
            variantAttributes: filtered
        });
    } catch (error) {
        console.error('Error fetching active variant attributes:', error);
        res.status(500).json({
            status: 500,
            message: 'Error fetching active variant attributes',
            error: error.message
        });
    }
};

// Get only active variant attribute names (without values) - for initial dropdown
const getActiveVariantAttributeNames = async (req, res) => {
    try {
        const variantAttributes = await VariantAttribute.find({ isActive: true, isDeleted: { $ne: true } })
            .select('name slug hasModels description')
            .sort({ name: 1 });

        res.status(200).json({
            status: 200,
            variantAttributes: variantAttributes.map(attr => ({
                _id: attr._id,
                name: attr.name,
                slug: attr.slug,
                hasModels: attr.hasModels,
                description: attr.description
            }))
        });
    } catch (error) {
        console.error('Error fetching variant attribute names:', error);
        res.status(500).json({
            status: 500,
            message: 'Error fetching variant attribute names',
            error: error.message
        });
    }
};

// Get values for a specific variant attribute by ID (lazy loading)
const getVariantAttributeValues = async (req, res) => {
    try {
        const { id } = req.params;
        const variantAttribute = await VariantAttribute.findById(id)
            .select('name slug values hasModels');

        if (!variantAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Variant attribute not found'
            });
        }

        // Filter active and non-deleted values and models only
        const activeValues = (variantAttribute.values || [])
            .filter(v => v.isActive !== false && v.isDeleted !== true)
            .map(v => ({
                _id: v._id,
                name: v.name,
                slug: v.slug,
                colorCode: v.colorCode || null,
                isActive: v.isActive,
                models: (v.models || [])
                    .filter(m => m.isActive !== false && m.isDeleted !== true)
                    .map(m => ({
                        _id: m._id,
                        name: m.name,
                        slug: m.slug,
                        isActive: m.isActive
                    }))
            }));

        res.status(200).json({
            status: 200,
            attributeId: variantAttribute._id,
            attributeName: variantAttribute.name,
            attributeSlug: variantAttribute.slug,
            hasModels: variantAttribute.hasModels,
            values: activeValues
        });
    } catch (error) {
        console.error('Error fetching variant attribute values:', error);
        res.status(500).json({
            status: 500,
            message: 'Error fetching variant attribute values',
            error: error.message
        });
    }
};

// Get all variant attributes (supports ?slug=brand query to fetch specific attribute with values)
const getAllVariantAttributes = async (req, res) => {
    try {
        const { slug } = req.query;

        // If slug is provided, fetch specific attribute with its values
        if (slug) {
            const variantAttribute = await VariantAttribute.findOne({ slug, isDeleted: { $ne: true } });

            if (!variantAttribute) {
                return res.status(404).json({
                    status: 404,
                    message: `Variant attribute with slug '${slug}' not found`
                });
            }

            // Filter active and non-deleted values only
            const activeValues = (variantAttribute.values || [])
                .filter(v => v.isActive !== false && v.isDeleted !== true)
                .map(v => ({
                    _id: v._id,
                    name: v.name,
                    slug: v.slug,
                    colorCode: v.colorCode || null,
                    isActive: v.isActive,
                    models: (v.models || [])
                        .filter(m => m.isActive !== false && m.isDeleted !== true)
                        .map(m => ({
                            _id: m._id,
                            name: m.name,
                            slug: m.slug,
                            isActive: m.isActive
                        }))
                }));

            return res.status(200).json({
                status: 200,
                message: 'Variant attribute fetched successfully',
                variantAttribute: {
                    _id: variantAttribute._id,
                    name: variantAttribute.name,
                    slug: variantAttribute.slug,
                    hasModels: variantAttribute.hasModels,
                    description: variantAttribute.description,
                    isActive: variantAttribute.isActive
                },
                values: activeValues
            });
        }

        // No slug provided - fetch all attributes (excluding deleted)
        const variantAttributes = await VariantAttribute.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });

        // Filter out deleted values and models from each attribute
        const filteredAttributes = variantAttributes.map(attr => {
            const attrObj = attr.toObject();
            return {
                ...attrObj,
                values: (attrObj.values || [])
                    .filter(v => v.isDeleted !== true)
                    .map(v => ({
                        ...v,
                        models: (v.models || []).filter(m => m.isDeleted !== true)
                    }))
            };
        });

        res.status(200).json({
            status: 200,
            message: 'Variant attributes fetched successfully',
            variantAttributes: filteredAttributes
        });
    } catch (error) {
        console.error('Error fetching variant attributes:', error);
        res.status(500).json({
            status: 500,
            message: 'Error fetching variant attributes',
            error: error.message
        });
    }
};

// Get single variant attribute by ID
const getVariantAttributeById = async (req, res) => {
    try {
        const { id } = req.params;
        const variantAttribute = await VariantAttribute.findById(id);

        if (!variantAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Variant attribute not found'
            });
        }

        res.status(200).json({
            status: 200,
            message: 'Variant attribute fetched successfully',
            variantAttribute
        });
    } catch (error) {
        console.error('Error fetching variant attribute:', error);
        res.status(500).json({
            status: 500,
            message: 'Error fetching variant attribute',
            error: error.message
        });
    }
};

// Update variant attribute
const updateVariantAttribute = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const variantAttribute = await VariantAttribute.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        if (!variantAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Variant attribute not found'
            });
        }

        res.status(200).json({
            status: 200,
            message: 'Variant attribute updated successfully',
            variantAttribute
        });
    } catch (error) {
        console.error('Error updating variant attribute:', error);
        res.status(500).json({
            status: 500,
            message: 'Error updating variant attribute',
            error: error.message
        });
    }
};

// Update variant attribute value status
const updateVariantAttributeValue = async (req, res) => {
    try {
        const { id, valueSlug } = req.params;
        const { isActive, isDeleted } = req.body;

        const variantAttribute = await VariantAttribute.findById(id);

        if (!variantAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Variant attribute not found'
            });
        }

        // Find and update the value
        const valueIndex = variantAttribute.values.findIndex(v => v.slug === valueSlug);

        if (valueIndex === -1) {
            return res.status(404).json({
                status: 404,
                message: 'Value not found'
            });
        }

        if (isActive !== undefined) {
            variantAttribute.values[valueIndex].isActive = isActive;
        }
        if (isDeleted !== undefined) {
            variantAttribute.values[valueIndex].isDeleted = isDeleted;
        }
        await variantAttribute.save();

        res.status(200).json({
            status: 200,
            message: isDeleted ? 'Value deleted successfully' : 'Value status updated successfully',
            variantAttribute
        });
    } catch (error) {
        console.error('Error updating value status:', error);
        res.status(500).json({
            status: 500,
            message: 'Error updating value status',
            error: error.message
        });
    }
};

// Add value to variant attribute
const addValueToAttribute = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive = true, colorCode, icon, description } = req.body;

        const variantAttribute = await VariantAttribute.findById(id);

        if (!variantAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Variant attribute not found'
            });
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/g, '').replace(/^_+/, '');

        // Check if value already exists
        const existingValue = variantAttribute.values.find(v => v.slug === slug);
        if (existingValue) {
            return res.status(400).json({
                status: 400,
                message: 'Value with this name already exists'
            });
        }

        const newValue = {
            name,
            slug,
            isActive,
            colorCode: colorCode || null,
            icon: icon || null,
            description: description || null,
            models: []
        };

        variantAttribute.values.push(newValue);
        await variantAttribute.save();

        res.status(201).json({
            status: 201,
            message: 'Value added successfully',
            variantAttribute
        });
    } catch (error) {
        console.error('Error adding value:', error);
        res.status(500).json({
            status: 500,
            message: 'Error adding value',
            error: error.message
        });
    }
};

// Delete value from variant attribute
const deleteValueFromAttribute = async (req, res) => {
    try {
        const { id, valueSlug } = req.params;

        const variantAttribute = await VariantAttribute.findById(id);

        if (!variantAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Variant attribute not found'
            });
        }

        const valueIndex = variantAttribute.values.findIndex(v => v.slug === valueSlug);

        if (valueIndex === -1) {
            return res.status(404).json({
                status: 404,
                message: 'Value not found'
            });
        }

        variantAttribute.values.splice(valueIndex, 1);
        await variantAttribute.save();

        res.status(200).json({
            status: 200,
            message: 'Value deleted successfully',
            variantAttribute
        });
    } catch (error) {
        console.error('Error deleting value:', error);
        res.status(500).json({
            status: 500,
            message: 'Error deleting value',
            error: error.message
        });
    }
};

// Add model to value
const addModelToValue = async (req, res) => {
    try {
        const { id, valueSlug } = req.params;
        const { name, isActive = true } = req.body;

        const variantAttribute = await VariantAttribute.findById(id);

        if (!variantAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Variant attribute not found'
            });
        }

        const valueIndex = variantAttribute.values.findIndex(v => v.slug === valueSlug);

        if (valueIndex === -1) {
            return res.status(404).json({
                status: 404,
                message: 'Value not found'
            });
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/g, '').replace(/^_+/, '');

        // Check if model already exists
        const existingModel = variantAttribute.values[valueIndex].models?.find(m => m.slug === slug);
        if (existingModel) {
            return res.status(400).json({
                status: 400,
                message: 'Model with this name already exists'
            });
        }

        const newModel = {
            name,
            slug,
            isActive
        };

        if (!variantAttribute.values[valueIndex].models) {
            variantAttribute.values[valueIndex].models = [];
        }
        variantAttribute.values[valueIndex].models.push(newModel);
        await variantAttribute.save();

        res.status(201).json({
            status: 201,
            message: 'Model added successfully',
            variantAttribute
        });
    } catch (error) {
        console.error('Error adding model:', error);
        res.status(500).json({
            status: 500,
            message: 'Error adding model',
            error: error.message
        });
    }
};

// Delete model from value
const deleteModelFromValue = async (req, res) => {
    try {
        const { id, valueSlug, modelSlug } = req.params;

        const variantAttribute = await VariantAttribute.findById(id);

        if (!variantAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Variant attribute not found'
            });
        }

        const valueIndex = variantAttribute.values.findIndex(v => v.slug === valueSlug);

        if (valueIndex === -1) {
            return res.status(404).json({
                status: 404,
                message: 'Value not found'
            });
        }

        const modelIndex = variantAttribute.values[valueIndex].models?.findIndex(m => m.slug === modelSlug);

        if (modelIndex === -1 || modelIndex === undefined) {
            return res.status(404).json({
                status: 404,
                message: 'Model not found'
            });
        }

        variantAttribute.values[valueIndex].models.splice(modelIndex, 1);
        await variantAttribute.save();

        res.status(200).json({
            status: 200,
            message: 'Model deleted successfully',
            variantAttribute
        });
    } catch (error) {
        console.error('Error deleting model:', error);
        res.status(500).json({
            status: 500,
            message: 'Error deleting model',
            error: error.message
        });
    }
};

// Update model status
const updateModelStatus = async (req, res) => {
    try {
        const { id, valueSlug, modelSlug } = req.params;
        const { isActive, isDeleted } = req.body;

        const variantAttribute = await VariantAttribute.findById(id);

        if (!variantAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Variant attribute not found'
            });
        }

        const valueIndex = variantAttribute.values.findIndex(v => v.slug === valueSlug);

        if (valueIndex === -1) {
            return res.status(404).json({
                status: 404,
                message: 'Value not found'
            });
        }

        const modelIndex = variantAttribute.values[valueIndex].models?.findIndex(m => m.slug === modelSlug);

        if (modelIndex === -1 || modelIndex === undefined) {
            return res.status(404).json({
                status: 404,
                message: 'Model not found'
            });
        }

        if (isActive !== undefined) {
            variantAttribute.values[valueIndex].models[modelIndex].isActive = isActive;
        }
        if (isDeleted !== undefined) {
            variantAttribute.values[valueIndex].models[modelIndex].isDeleted = isDeleted;
        }
        await variantAttribute.save();

        res.status(200).json({
            status: 200,
            message: isDeleted ? 'Model deleted successfully' : 'Model status updated successfully',
            variantAttribute
        });
    } catch (error) {
        console.error('Error updating model status:', error);
        res.status(500).json({
            status: 500,
            message: 'Error updating model status',
            error: error.message
        });
    }
};

// Update value details (name and status)
const updateValueDetails = async (req, res) => {
    try {
        const { id, valueSlug } = req.params;
        const { name, isActive, colorCode, icon, description } = req.body;

        const variantAttribute = await VariantAttribute.findById(id);

        if (!variantAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Variant attribute not found'
            });
        }

        const valueIndex = variantAttribute.values.findIndex(v => v.slug === valueSlug);

        if (valueIndex === -1) {
            return res.status(404).json({
                status: 404,
                message: 'Value not found'
            });
        }

        // Update the value
        if (name !== undefined) {
            variantAttribute.values[valueIndex].name = name;
            // Update slug if name changed (use underscores)
            variantAttribute.values[valueIndex].slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/g, '').replace(/^_+/, '');
        }
        if (isActive !== undefined) {
            variantAttribute.values[valueIndex].isActive = isActive;
        }
        if (colorCode !== undefined) {
            variantAttribute.values[valueIndex].colorCode = colorCode;
        }
        if (icon !== undefined) {
            variantAttribute.values[valueIndex].icon = icon;
        }
        if (description !== undefined) {
            variantAttribute.values[valueIndex].description = description;
        }

        await variantAttribute.save();

        res.status(200).json({
            status: 200,
            message: 'Value updated successfully',
            variantAttribute
        });
    } catch (error) {
        console.error('Error updating value:', error);
        res.status(500).json({
            status: 500,
            message: 'Error updating value',
            error: error.message
        });
    }
};

// Update model details (name and status)
const updateModelDetails = async (req, res) => {
    try {
        const { id, valueSlug, modelSlug } = req.params;
        const { name, isActive } = req.body;

        const variantAttribute = await VariantAttribute.findById(id);

        if (!variantAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Variant attribute not found'
            });
        }

        const valueIndex = variantAttribute.values.findIndex(v => v.slug === valueSlug);

        if (valueIndex === -1) {
            return res.status(404).json({
                status: 404,
                message: 'Value not found'
            });
        }

        const modelIndex = variantAttribute.values[valueIndex].models?.findIndex(m => m.slug === modelSlug);

        if (modelIndex === -1 || modelIndex === undefined) {
            return res.status(404).json({
                status: 404,
                message: 'Model not found'
            });
        }

        // Update the model
        if (name !== undefined) {
            variantAttribute.values[valueIndex].models[modelIndex].name = name;
            // Update slug if name changed (use underscores)
            variantAttribute.values[valueIndex].models[modelIndex].slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/g, '').replace(/^_+/, '');
        }
        if (isActive !== undefined) {
            variantAttribute.values[valueIndex].models[modelIndex].isActive = isActive;
        }

        await variantAttribute.save();

        res.status(200).json({
            status: 200,
            message: 'Model updated successfully',
            variantAttribute
        });
    } catch (error) {
        console.error('Error updating model:', error);
        res.status(500).json({
            status: 500,
            message: 'Error updating model',
            error: error.message
        });
    }
};

// Create new variant attribute
const createVariantAttribute = async (req, res) => {
    try {
        const { name, values, description, isActive } = req.body;

        const variantAttribute = new VariantAttribute({
            name,
            values,
            description,
            isActive
        });

        await variantAttribute.save();

        res.status(201).json({
            status: 201,
            message: 'Variant attribute created successfully',
            variantAttribute
        });
    } catch (error) {
        console.error('Error creating variant attribute:', error);
        res.status(500).json({
            status: 500,
            message: 'Error creating variant attribute',
            error: error.message
        });
    }
};

// Delete variant attribute
const deleteVariantAttribute = async (req, res) => {
    try {
        const { id } = req.params;

        const variantAttribute = await VariantAttribute.findByIdAndDelete(id);

        if (!variantAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Variant attribute not found'
            });
        }

        res.status(200).json({
            status: 200,
            message: 'Variant attribute deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting variant attribute:', error);
        res.status(500).json({
            status: 500,
            message: 'Error deleting variant attribute',
            error: error.message
        });
    }
};

// Get brands with product counts for admin panel
const getBrandsWithProductCount = async (req, res) => {
    try {
        // 1. Fetch brands from VariantAttribute with slug "brands"
        const brandAttribute = await VariantAttribute.findOne({ slug: 'brands' });

        if (!brandAttribute) {
            return res.status(404).json({
                status: 404,
                message: 'Brands attribute not found'
            });
        }

        // 2. Get active brand values
        const activeBrands = (brandAttribute.values || [])
            .filter(v => v.isActive !== false)
            .map(v => ({
                _id: v._id,
                name: v.name,
                slug: v.slug,
                isActive: v.isActive
            }));

        // 3. Aggregate product counts per brand (case-insensitive)
        const productCounts = await Product.aggregate([
            {
                $match: {
                    isdeleted: { $ne: true },
                    brand: { $ne: null }
                }
            },
            {
                $group: {
                    _id: { $toLower: '$brand' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 4. Create a map of brand name (lowercase) to product count
        const countMap = {};
        productCounts.forEach(item => {
            if (item._id) {
                countMap[item._id.toLowerCase()] = item.count;
            }
        });

        console.log('Product counts by brand:', productCounts);
        console.log('Count map:', countMap);

        // 5. Merge brands with product counts (case-insensitive lookup)
        const brandsWithCounts = activeBrands.map(brand => ({
            _id: brand._id,
            name: brand.name,
            slug: brand.slug,
            Logo: null,
            metaDescription: '',
            isPublish: brand.isActive !== false,
            isFeatured: false,
            productCount: countMap[brand.name.toLowerCase()] || 0
        }));

        // 6. Sort by product count descending, then by name
        brandsWithCounts.sort((a, b) => {
            if (b.productCount !== a.productCount) {
                return b.productCount - a.productCount;
            }
            return a.name.localeCompare(b.name);
        });

        // 7. Calculate total products
        const totalProducts = brandsWithCounts.reduce((sum, brand) => sum + brand.productCount, 0);

        res.status(200).json({
            status: 200,
            message: 'Brands with product counts fetched successfully',
            brands: brandsWithCounts,
            totalBrands: brandsWithCounts.length,
            totalProducts: totalProducts
        });
    } catch (error) {
        console.error('Error fetching brands with product counts:', error);
        res.status(500).json({
            status: 500,
            message: 'Error fetching brands with product counts',
            error: error.message
        });
    }
};

module.exports = {
    getAllVariantAttributes,
    getActiveVariantAttributes,
    getActiveVariantAttributeNames,
    getVariantAttributeValues,
    getVariantAttributeById,
    updateVariantAttribute,
    updateVariantAttributeValue,
    createVariantAttribute,
    deleteVariantAttribute,
    addValueToAttribute,
    deleteValueFromAttribute,
    addModelToValue,
    deleteModelFromValue,
    updateModelStatus,
    updateValueDetails,
    updateModelDetails,
    getBrandsWithProductCount
};
