// controller/productRelatedController.js
const Product = require('../models/product');

const productRelatedController = {
    // Add a related product
    postRelatedProduct: async (req, res) => {
        try {
            const { productId, relatedProductId, relatedProductName, relatedProductImage, relatedProductBrand, relatedProductCondition } = req.body;
            console.log('Adding related product:', req.body);

            // Find the product by ID
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            // Ensure the relatedProducts array is initialized
            if (!product.relatedProducts) {
                product.relatedProducts = [];
            }

            // Check if the related product already exists
            const existingRelated = product.relatedProducts.find(
                rp => rp.relatedProductId && rp.relatedProductId.toString() === relatedProductId
            );
            if (existingRelated) {
                return res.status(400).json({ message: 'This product is already added as a related product' });
            }

            // Prevent adding the product as its own related product
            if (productId === relatedProductId) {
                return res.status(400).json({ message: 'A product cannot be related to itself' });
            }

            // Get the next order number
            const maxOrder = product.relatedProducts.length > 0
                ? Math.max(...product.relatedProducts.map(rp => rp.order || 0))
                : -1;

            // Create a new related product object
            const newRelatedProduct = {
                relatedProductId,
                relatedProductName,
                relatedProductImage: relatedProductImage || null,
                relatedProductBrand: relatedProductBrand || null,
                relatedProductCondition: relatedProductCondition || null,
                order: maxOrder + 1,
                createdAt: new Date()
            };

            product.relatedProducts.push(newRelatedProduct);

            // Save the updated product document
            const updatedProduct = await product.save();

            // Respond with a success message
            res.status(201).json({
                message: 'Related product successfully added',
                relatedProducts: updatedProduct.relatedProducts
            });
        } catch (error) {
            console.error('Error adding related product:', error);
            res.json({ message: 'Failed to add related product', status: 500 });
        }
    },

    // Get all related products for a product
    getRelatedProducts: async (req, res) => {
        try {
            const { productId } = req.params;
            console.log('Getting related products for product:', productId);

            // Find the product by ID and retrieve only the relatedProducts field
            const product = await Product.findById(productId).select('relatedProducts name');

            if (!product) {
                return res.json({ message: 'Product not found', status: 404 });
            }

            // Sort related products by order
            const sortedRelatedProducts = product.relatedProducts
                ? product.relatedProducts.sort((a, b) => (a.order || 0) - (b.order || 0))
                : [];

            res.json({
                message: 'Related products successfully retrieved',
                relatedProducts: sortedRelatedProducts,
                status: 201
            });
        } catch (error) {
            console.error('Error getting related products:', error);
            res.json({ message: 'Failed to get related products', status: 500 });
        }
    },

    // Delete a related product
    deleteRelatedProduct: async (req, res) => {
        try {
            const { relatedId } = req.params;
            console.log('Deleting related product:', relatedId);

            // Find the product that contains the related product
            const product = await Product.findOne({ "relatedProducts._id": relatedId });
            if (!product) {
                return res.status(404).json({ message: 'Related product not found' });
            }

            // Filter out the related product to delete
            const initialLength = product.relatedProducts.length;
            product.relatedProducts = product.relatedProducts.filter(
                (rp) => rp._id.toString() !== relatedId
            );

            if (product.relatedProducts.length === initialLength) {
                return res.status(404).json({ message: 'Related product not found' });
            }

            // Save the updated product document
            await product.save();

            console.log(`Related product with ID ${relatedId} deleted successfully.`);

            res.status(200).json({
                message: 'Related product successfully deleted',
            });
        } catch (error) {
            console.error('Error deleting related product:', error);
            res.status(500).json({ message: 'Failed to delete related product' });
        }
    },

    // Reorder related products
    reorderRelatedProducts: async (req, res) => {
        try {
            const { productId, relatedOrder } = req.body;
            console.log('Reordering related products:', req.body);

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            // Update the order of each related product
            relatedOrder.forEach((item, index) => {
                const relatedProduct = product.relatedProducts.id(item.id);
                if (relatedProduct) {
                    relatedProduct.order = item.order !== undefined ? item.order : index;
                }
            });

            product.markModified('relatedProducts');
            await product.save();

            res.status(200).json({
                message: 'Related products reordered successfully',
                relatedProducts: product.relatedProducts.sort((a, b) => a.order - b.order)
            });
        } catch (error) {
            console.error('Error reordering related products:', error);
            res.status(500).json({ message: 'Failed to reorder related products' });
        }
    },

    // Get related products for frontend display (with full product details)
    getRelatedProductsForDisplay: async (req, res) => {
        try {
            const { productId } = req.params;
            console.log('Getting related products for display:', productId);

            // Find the product
            const product = await Product.findById(productId).select('relatedProducts');

            if (!product) {
                return res.json({ message: 'Product not found', status: 404 });
            }

            if (!product.relatedProducts || product.relatedProducts.length === 0) {
                return res.json({
                    message: 'No related products found',
                    relatedProducts: [],
                    status: 200
                });
            }

            // Get the IDs of related products
            const relatedProductIds = product.relatedProducts
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(rp => rp.relatedProductId);

            // Fetch full details of related products
            const relatedProductDetails = await Product.find({
                _id: { $in: relatedProductIds },
                status: true
            }).select('name producturl thumbnail_image brand condition variantValues');

            // Process products to include price info
            const processedProducts = relatedProductDetails.map(prod => {
                let minPrice = null;
                let minSalePrice = null;

                if (prod.variantValues && prod.variantValues.length > 0) {
                    const prices = prod.variantValues.map(v => v.Price).filter(p => p != null);
                    const salePrices = prod.variantValues.map(v => v.salePrice).filter(p => p != null);

                    if (prices.length > 0) minPrice = Math.min(...prices);
                    if (salePrices.length > 0) minSalePrice = Math.min(...salePrices);
                }

                return {
                    _id: prod._id,
                    name: prod.name,
                    producturl: prod.producturl,
                    thumbnail_image: prod.thumbnail_image,
                    brand: prod.brand,
                    condition: prod.condition,
                    minPrice,
                    minSalePrice
                };
            });

            // Sort by the original order
            const orderedProducts = relatedProductIds
                .map(id => processedProducts.find(p => p._id.toString() === id.toString()))
                .filter(p => p !== undefined);

            res.json({
                message: 'Related products retrieved successfully',
                relatedProducts: orderedProducts,
                status: 200
            });
        } catch (error) {
            console.error('Error getting related products for display:', error);
            res.json({ message: 'Failed to get related products', status: 500 });
        }
    }
};

module.exports = productRelatedController;
