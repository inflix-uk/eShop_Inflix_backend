// controller/categoryDisplayProductsController.js
const CategoryDisplayProducts = require('../models/categoryDisplayProducts');
const Product = require('../models/product');

const categoryDisplayProductsController = {
    // Save or update display products for a category
    saveDisplayProducts: async (req, res) => {
        try {
            const { categoryId, categoryName, products } = req.body;

            // Validate required fields
            if (!categoryId || !categoryName) {
                return res.status(400).json({
                    message: 'Category ID and name are required',
                    status: 400
                });
            }

            // Format products array
            const formattedProducts = products.map(product => ({
                productId: product._id || product.productId,
                productName: product.name || product.productName,
                productUrl: product.producturl || product.productUrl,
                addedAt: new Date()
            }));

            // Find existing document or create new one
            const existingDoc = await CategoryDisplayProducts.findOne({ categoryId });

            if (existingDoc) {
                // Update existing document
                existingDoc.products = formattedProducts;
                existingDoc.updatedAt = new Date();
                await existingDoc.save();

                return res.status(200).json({
                    message: 'Display products updated successfully',
                    data: existingDoc,
                    status: 200
                });
            } else {
                // Create new document
                const newDisplayProducts = new CategoryDisplayProducts({
                    categoryId,
                    categoryName,
                    products: formattedProducts
                });

                await newDisplayProducts.save();

                return res.status(201).json({
                    message: 'Display products saved successfully',
                    data: newDisplayProducts,
                    status: 201
                });
            }
        } catch (error) {
            console.error('Error saving display products:', error);
            return res.status(500).json({
                message: 'Failed to save display products',
                error: error.message,
                status: 500
            });
        }
    },

    // Get display products for a category
    getDisplayProducts: async (req, res) => {
        try {
            const { categoryId } = req.params;

            if (!categoryId) {
                return res.status(400).json({
                    message: 'Category ID is required',
                    status: 400
                });
            }

            const displayProducts = await CategoryDisplayProducts.findOne({ categoryId });

            if (!displayProducts) {
                return res.status(200).json({
                    message: 'No display products found for this category',
                    data: { categoryId, products: [] },
                    status: 200
                });
            }

            // Fetch full product details for each product
            const productIds = displayProducts.products.map(p => p.productId);
            const fullProducts = await Product.find({ _id: { $in: productIds } })
                .select('_id name producturl category subCategory brand condition thumbnail_image variantValues productType')
                .lean();

            // Map full product details with stored info
            const productsWithDetails = displayProducts.products.map(storedProduct => {
                const fullProduct = fullProducts.find(p => p._id.toString() === storedProduct.productId.toString());
                if (fullProduct) {
                    // Calculate min prices
                    let minPrice = null;
                    let minSalePrice = null;
                    if (fullProduct.variantValues && fullProduct.variantValues.length > 0) {
                        const prices = fullProduct.variantValues.map(v => v.Price).filter(p => p != null);
                        const salePrices = fullProduct.variantValues.map(v => v.salePrice).filter(p => p != null);
                        if (prices.length > 0) minPrice = Math.min(...prices);
                        if (salePrices.length > 0) minSalePrice = Math.min(...salePrices);
                    }

                    return {
                        _id: fullProduct._id,
                        name: fullProduct.name,
                        producturl: fullProduct.producturl,
                        category: fullProduct.category,
                        subCategory: fullProduct.subCategory,
                        brand: fullProduct.brand,
                        condition: fullProduct.condition,
                        thumbnail_image: fullProduct.thumbnail_image,
                        minPrice,
                        minSalePrice,
                        productType: fullProduct.productType?.type || 'single',
                        addedAt: storedProduct.addedAt
                    };
                }
                return null;
            }).filter(p => p !== null);

            return res.status(200).json({
                message: 'Display products retrieved successfully',
                data: {
                    categoryId: displayProducts.categoryId,
                    categoryName: displayProducts.categoryName,
                    products: productsWithDetails,
                    totalCount: productsWithDetails.length
                },
                status: 200
            });
        } catch (error) {
            console.error('Error getting display products:', error);
            return res.status(500).json({
                message: 'Failed to get display products',
                error: error.message,
                status: 500
            });
        }
    },

    // Remove a product from display
    removeDisplayProduct: async (req, res) => {
        try {
            const { categoryId, productId } = req.params;

            const displayProducts = await CategoryDisplayProducts.findOne({ categoryId });

            if (!displayProducts) {
                return res.status(404).json({
                    message: 'No display products found for this category',
                    status: 404
                });
            }

            displayProducts.products = displayProducts.products.filter(
                p => p.productId.toString() !== productId
            );
            displayProducts.updatedAt = new Date();
            await displayProducts.save();

            return res.status(200).json({
                message: 'Product removed from display successfully',
                data: displayProducts,
                status: 200
            });
        } catch (error) {
            console.error('Error removing display product:', error);
            return res.status(500).json({
                message: 'Failed to remove display product',
                error: error.message,
                status: 500
            });
        }
    },

    // Get all categories with display products
    getAllDisplayProducts: async (req, res) => {
        try {
            const allDisplayProducts = await CategoryDisplayProducts.find()
                .sort({ updatedAt: -1 });

            return res.status(200).json({
                message: 'All display products retrieved successfully',
                data: allDisplayProducts,
                totalCategories: allDisplayProducts.length,
                status: 200
            });
        } catch (error) {
            console.error('Error getting all display products:', error);
            return res.status(500).json({
                message: 'Failed to get all display products',
                error: error.message,
                status: 500
            });
        }
    },

    getDisplayProductsByName: async (req, res) => {
        try {
            const { categoryName } = req.params;
            if (!categoryName) return res.status(400).json({ message: "Category name is required", status: 400 });
            const decodedName = decodeURIComponent(categoryName);
            const displayProducts = await CategoryDisplayProducts.findOne({ categoryName: { $regex: new RegExp(`^${decodedName}$`, "i") } });
            if (!displayProducts || displayProducts.products.length === 0) return res.status(200).json({ message: "No display products found", categoryName: decodedName, products: [], totalCount: 0, status: 200 });
            const productIds = displayProducts.products.map(p => p.productId);
            const fullProducts = await Product.find({ _id: { $in: productIds } }).select("_id name producturl category subCategory brand condition thumbnail_image variantValues productType").lean();
            const productsWithDetails = displayProducts.products.map(storedProduct => {
                const fullProduct = fullProducts.find(p => p._id.toString() === storedProduct.productId.toString());
                if (fullProduct) {
                    let minPrice = null, minSalePrice = null;
                    if (fullProduct.variantValues && fullProduct.variantValues.length > 0) {
                        const prices = fullProduct.variantValues.map(v => v.Price).filter(p => p != null);
                        const salePrices = fullProduct.variantValues.map(v => v.salePrice).filter(p => p != null);
                        if (prices.length > 0) minPrice = Math.min(...prices);
                        if (salePrices.length > 0) minSalePrice = Math.min(...salePrices);
                    }
                    return { _id: fullProduct._id, name: fullProduct.name, producturl: fullProduct.producturl, category: fullProduct.category, subCategory: fullProduct.subCategory, brand: fullProduct.brand, condition: fullProduct.condition, thumbnail_image: fullProduct.thumbnail_image, minPrice, minSalePrice, productType: fullProduct.productType?.type || "single", addedAt: storedProduct.addedAt };
                }
                return null;
            }).filter(p => p !== null);
            return res.status(200).json({ message: "Display products retrieved successfully", categoryId: displayProducts.categoryId, categoryName: displayProducts.categoryName, products: productsWithDetails, totalCount: productsWithDetails.length, status: 200 });
        } catch (error) {
            console.error("Error getting display products by name:", error);
            return res.status(500).json({ message: "Failed to get display products", error: error.message, status: 500 });
        }
    }
};

module.exports = categoryDisplayProductsController;
