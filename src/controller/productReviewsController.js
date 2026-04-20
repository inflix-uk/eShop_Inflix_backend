// controller/productReviewsController.js
const ProductReview = require("../models/productReviews");
const Product = require('../models/product');

const productReviewsController = {
    // Create a new review
    postProductReviews: async (req, res) => {
        try {
            const { reviewDetails } = req.body;
            console.log(req.body);

            // Verify product exists
            const product = await Product.findById(reviewDetails.productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found', status: 404 });
            }

            // Create new review in ProductReview collection
            const newReview = new ProductReview({
                name: reviewDetails.fullName,
                email: reviewDetails.userEmail,
                comment: reviewDetails.review,
                rating: reviewDetails.rating,
                productId: reviewDetails.productId,
                status: reviewDetails.status || 'Pending',
                DateTime: reviewDetails.DateTime || new Date().toISOString()
            });

            await newReview.save();

            res.status(201).json({
                message: 'Review successfully posted',
                review: newReview,
                status: 201
            });
        } catch (error) {
            console.error('Error posting review:', error);
            res.json({ message: 'Failed to post review', status: 500 });
        }
    },

    // Get all reviews for a specific product
    getAllProductReviews: async (req, res) => {
        try {
            const { id } = req.params;
            console.log('Getting reviews for product:', id);

            // Verify product exists
            const product = await Product.findById(id).select('name thumbnail_image producturl');
            if (!product) {
                return res.json({ message: 'Product not found', status: 404 });
            }

            // Get all approved reviews for this product
            const reviews = await ProductReview.find({ productId: id, status: 'Approved' })
                .sort({ createdAt: -1 });

            res.json({
                message: 'Reviews successfully retrieved',
                product: {
                    _id: product._id,
                    name: product.name,
                    thumbnail_image: product.thumbnail_image,
                    producturl: product.producturl,
                    reviewDetails: reviews
                },
                status: 201
            });
        } catch (error) {
            console.error('Error getting reviews:', error);
            res.json({ message: 'Failed to get reviews', status: 500 });
        }
    },

    // Update a review
    updateProductReviews: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, email, comment, rating, status, DateTime } = req.body;

            console.log('Request params:', req.params);
            console.log('Request body:', req.body);

            const review = await ProductReview.findById(id);
            if (!review) {
                return res.status(404).json({ message: 'Review not found', status: 404 });
            }

            // Update fields
            if (name !== undefined) review.name = name;
            if (email !== undefined) review.email = email;
            if (comment !== undefined) review.comment = comment;
            if (rating !== undefined) review.rating = Number(rating);
            if (status !== undefined) review.status = status;
            if (DateTime !== undefined) review.DateTime = DateTime;
            review.updatedAt = new Date();

            await review.save();

            console.log('Updated review:', review);

            res.status(200).json({
                message: 'Review successfully updated',
                review: review,
                status: 200
            });
        } catch (error) {
            console.error('Error updating review:', error);
            res.status(500).json({ message: 'Failed to update review', status: 500 });
        }
    },

    // Get single review by ID
    getReviewsbyId: async (req, res) => {
        try {
            const { id } = req.params;
            console.log('Getting review:', id);

            const review = await ProductReview.findById(id);
            if (!review) {
                return res.json({ message: 'Review not found', status: 404 });
            }

            res.json({ message: 'Review successfully retrieved', review, status: 201 });
        } catch (error) {
            console.error('Error getting review:', error);
            res.status(500).json({ message: 'Failed to get review', status: 500 });
        }
    },

    // Get all products with their reviews (for admin reviews page)
    getProductsAndReviewsDetails: async (req, res) => {
        try {
            // Get all products
            const products = await Product.find({}, 'name thumbnail_image _id producturl');
            if (!products) {
                return res.json({ message: 'Products not found', status: 404 });
            }

            // Get review counts for each product
            const productIds = products.map(p => p._id);
            const reviewCounts = await ProductReview.aggregate([
                { $match: { productId: { $in: productIds } } },
                { $group: { _id: '$productId', count: { $sum: 1 } } }
            ]);

            // Create a map of product ID to review count
            const countMap = {};
            reviewCounts.forEach(r => {
                countMap[r._id.toString()] = r.count;
            });

            // Get all reviews grouped by product for display
            const allReviews = await ProductReview.find({ productId: { $in: productIds } })
                .sort({ createdAt: -1 });

            // Group reviews by product
            const reviewsByProduct = {};
            allReviews.forEach(review => {
                const productId = review.productId.toString();
                if (!reviewsByProduct[productId]) {
                    reviewsByProduct[productId] = [];
                }
                reviewsByProduct[productId].push(review);
            });

            // Attach reviews to products
            const productsWithReviews = products.map(product => ({
                _id: product._id,
                name: product.name,
                thumbnail_image: product.thumbnail_image,
                producturl: product.producturl,
                reviewDetails: reviewsByProduct[product._id.toString()] || [],
                reviewCount: countMap[product._id.toString()] || 0
            }));

            return res.json({
                message: 'Products retrieved',
                products: productsWithReviews,
                status: 201
            });
        } catch (error) {
            console.error('Error getting products and reviews details:', error);
            res.status(500).json({ message: 'Failed to get products and reviews details', status: 500 });
        }
    },

    // Delete a review
    deleteProductReview: async (req, res) => {
        try {
            const { id } = req.params;
            console.log('Deleting review:', id);

            const review = await ProductReview.findByIdAndDelete(id);
            if (!review) {
                return res.status(404).json({ message: 'Review not found', status: 404 });
            }

            console.log(`Review with ID ${id} deleted successfully.`);

            res.status(200).json({
                message: 'Review successfully deleted',
                status: 200
            });
        } catch (error) {
            console.error('Error deleting review:', error);
            res.status(500).json({ message: 'Failed to delete review', status: 500 });
        }
    },

    // Get all reviews (admin view - all reviews across products)
    getAllReviews: async (req, res) => {
        try {
            const { status, page = 1, limit = 20 } = req.query;

            const query = {};
            if (status) {
                query.status = status;
            }

            const reviews = await ProductReview.find(query)
                .populate('productId', 'name thumbnail_image producturl')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit));

            const total = await ProductReview.countDocuments(query);

            res.json({
                message: 'Reviews retrieved successfully',
                reviews,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit)
                },
                status: 200
            });
        } catch (error) {
            console.error('Error getting all reviews:', error);
            res.status(500).json({ message: 'Failed to get reviews', status: 500 });
        }
    },

    // Bulk update review status
    bulkUpdateReviewStatus: async (req, res) => {
        try {
            const { reviewIds, status } = req.body;

            if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
                return res.status(400).json({ message: 'Review IDs required', status: 400 });
            }

            if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status', status: 400 });
            }

            const result = await ProductReview.updateMany(
                { _id: { $in: reviewIds } },
                { $set: { status, updatedAt: new Date() } }
            );

            res.json({
                message: `${result.modifiedCount} reviews updated successfully`,
                status: 200
            });
        } catch (error) {
            console.error('Error bulk updating reviews:', error);
            res.status(500).json({ message: 'Failed to update reviews', status: 500 });
        }
    }
};

module.exports = productReviewsController;
