// controller/productFaqController.js
const ProductFaq = require('../models/productFaqs');
const Product = require('../models/product');

const productFaqController = {
    // Add a new FAQ to a product
    postProductFaq: async (req, res) => {
        try {
            const { faqDetails } = req.body;
            console.log('Adding FAQ:', req.body);

            // Verify product exists
            const product = await Product.findById(faqDetails.productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found', status: 404 });
            }

            // Get the next order number
            const lastFaq = await ProductFaq.findOne({ productId: faqDetails.productId })
                .sort({ order: -1 });
            const nextOrder = lastFaq ? lastFaq.order + 1 : 0;

            // Create new FAQ in ProductFaq collection
            const newFaq = new ProductFaq({
                question: faqDetails.question,
                answer: faqDetails.answer,
                productId: faqDetails.productId,
                status: faqDetails.status || 'Published',
                order: faqDetails.order !== undefined ? faqDetails.order : nextOrder
            });

            await newFaq.save();

            // Get all FAQs for this product to return
            const allFaqs = await ProductFaq.find({ productId: faqDetails.productId })
                .sort({ order: 1 });

            res.status(201).json({
                message: 'FAQ successfully added',
                faq: newFaq,
                faqDetails: allFaqs,
                status: 201
            });
        } catch (error) {
            console.error('Error adding FAQ:', error);
            res.json({ message: 'Failed to add FAQ', status: 500 });
        }
    },

    // Get all FAQs for a product
    getAllProductFaqs: async (req, res) => {
        try {
            const { id } = req.params;
            console.log('Getting FAQs for product:', id);

            // Verify product exists
            const product = await Product.findById(id).select('name thumbnail_image producturl');
            if (!product) {
                return res.json({ message: 'Product not found', status: 404 });
            }

            // Get all FAQs for this product
            const faqs = await ProductFaq.find({ productId: id })
                .sort({ order: 1 });

            res.json({
                message: 'FAQs successfully retrieved',
                product: {
                    _id: product._id,
                    name: product.name,
                    thumbnail_image: product.thumbnail_image,
                    producturl: product.producturl,
                    faqDetails: faqs
                },
                status: 201
            });
        } catch (error) {
            console.error('Error getting FAQs:', error);
            res.json({ message: 'Failed to get FAQs', status: 500 });
        }
    },

    // Update a FAQ
    updateProductFaq: async (req, res) => {
        try {
            const { id } = req.params;
            const { question, answer, status, order } = req.body;

            console.log('Updating FAQ:', req.params, req.body);

            const faq = await ProductFaq.findById(id);
            if (!faq) {
                return res.status(404).json({ message: 'FAQ not found', status: 404 });
            }

            // Update fields
            if (question !== undefined) faq.question = question;
            if (answer !== undefined) faq.answer = answer;
            if (status !== undefined) faq.status = status;
            if (order !== undefined) faq.order = order;
            faq.updatedAt = new Date();

            await faq.save();

            console.log('Updated FAQ:', faq);

            res.status(200).json({
                message: 'FAQ successfully updated',
                faq: faq,
                status: 200
            });
        } catch (error) {
            console.error('Error updating FAQ:', error);
            res.status(500).json({ message: 'Failed to update FAQ', status: 500 });
        }
    },

    // Get a single FAQ by ID
    getFaqById: async (req, res) => {
        try {
            const { id } = req.params;
            console.log('Getting FAQ by ID:', id);

            const faq = await ProductFaq.findById(id);
            if (!faq) {
                return res.json({ message: 'FAQ not found', status: 404 });
            }

            res.json({ message: 'FAQ successfully retrieved', faq, status: 201 });
        } catch (error) {
            console.error('Error getting FAQ:', error);
            res.status(500).json({ message: 'Failed to get FAQ', status: 500 });
        }
    },

    // Delete a FAQ
    deleteProductFaq: async (req, res) => {
        try {
            const { id } = req.params;
            console.log('Deleting FAQ:', id);

            const faq = await ProductFaq.findByIdAndDelete(id);
            if (!faq) {
                return res.status(404).json({ message: 'FAQ not found', status: 404 });
            }

            console.log(`FAQ with ID ${id} deleted successfully.`);

            res.status(200).json({
                message: 'FAQ successfully deleted',
                status: 200
            });
        } catch (error) {
            console.error('Error deleting FAQ:', error);
            res.status(500).json({ message: 'Failed to delete FAQ', status: 500 });
        }
    },

    // Reorder FAQs
    reorderProductFaqs: async (req, res) => {
        try {
            const { productId, faqOrder } = req.body;
            console.log('Reordering FAQs:', req.body);

            // Verify product exists
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found', status: 404 });
            }

            // Update the order of each FAQ
            const updatePromises = faqOrder.map((item, index) =>
                ProductFaq.findByIdAndUpdate(
                    item.id,
                    { order: index, updatedAt: new Date() },
                    { new: true }
                )
            );

            await Promise.all(updatePromises);

            // Get updated FAQs
            const updatedFaqs = await ProductFaq.find({ productId })
                .sort({ order: 1 });

            res.status(200).json({
                message: 'FAQs reordered successfully',
                faqDetails: updatedFaqs,
                status: 200
            });
        } catch (error) {
            console.error('Error reordering FAQs:', error);
            res.status(500).json({ message: 'Failed to reorder FAQs', status: 500 });
        }
    },

    // Get all FAQs (admin view - all FAQs across products)
    getAllFaqs: async (req, res) => {
        try {
            const { status, page = 1, limit = 20 } = req.query;

            const query = {};
            if (status) {
                query.status = status;
            }

            const faqs = await ProductFaq.find(query)
                .populate('productId', 'name thumbnail_image producturl')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit));

            const total = await ProductFaq.countDocuments(query);

            res.json({
                message: 'FAQs retrieved successfully',
                faqs,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit)
                },
                status: 200
            });
        } catch (error) {
            console.error('Error getting all FAQs:', error);
            res.status(500).json({ message: 'Failed to get FAQs', status: 500 });
        }
    },

    // Bulk update FAQ status
    bulkUpdateFaqStatus: async (req, res) => {
        try {
            const { faqIds, status } = req.body;

            if (!faqIds || !Array.isArray(faqIds) || faqIds.length === 0) {
                return res.status(400).json({ message: 'FAQ IDs required', status: 400 });
            }

            if (!['Published', 'Draft'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status', status: 400 });
            }

            const result = await ProductFaq.updateMany(
                { _id: { $in: faqIds } },
                { $set: { status, updatedAt: new Date() } }
            );

            res.json({
                message: `${result.modifiedCount} FAQs updated successfully`,
                status: 200
            });
        } catch (error) {
            console.error('Error bulk updating FAQs:', error);
            res.status(500).json({ message: 'Failed to update FAQs', status: 500 });
        }
    }
};

module.exports = productFaqController;
