// controller/productTagsController.js
const db = require("../../connections/mongo");
const bcrypt = require("bcrypt");
const ProductTag = require("../models/productTags");


const productTagsController = {

    // Define the route for creating a new product tag
    createProductTag: async (req, res) => {
        try {
            // Extract data from the request body
            const { name, isPublished } = req.body;

            // Create a new product tag instance
            const newProductTag = new ProductTag({
                name,
                isPublished,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Save the product tag to the database
            const savedProductTag = await newProductTag.save();

            // Respond with success message and the created product tag
            return res.json({ message: "Product tag created successfully", productTag: savedProductTag, status: 201 });
        } catch (error) {
            // Handle errors
            console.error('Error creating product tag:', error);
            // Respond with error message and status code 500 for internal server error
            return res.json({ error: 'Internal server error', status: 500 });
        }
    },

    getAllProductTag: async (req, res) => {
        try {
            // Retrieve all product tags from the database
            const allProductTags = await ProductTag.find({});

            // Respond with the array of product tags
            return res.json({ productTags: allProductTags, status: 201, message: 'Tags retrieved' });
        } catch (error) {
            // Handle errors
            console.error('Error fetching product tags:', error);
            // Respond with error message and status code 500 for internal server error
            return res.json({ error: 'Internal server error', status: 500 });
        }
    },

    deleteProductTag: async (req, res) => {
        try {
            // Extract product tag ID from the request parameters
            const productTagId = req.params.id;

            // Check if the product tag exists
            const existingProductTag = await ProductTag.findById(productTagId);
            if (!existingProductTag) {
                return res.json({ error: 'Product tag not found', status: 404 });
            }

            // Delete the product tag
            await ProductTag.deleteOne({ _id: productTagId });

            // Respond with success message
            return res.json({ message: 'Product tag deleted successfully', productTag: existingProductTag, status: 201 });
        } catch (error) {
            // Handle errors
            console.error('Error deleting product tag:', error);
            // Respond with error message and status code 500 for internal server error
            return res.json({ error: 'Internal server error', status: 500 });
        }
    },

    updateProductTag: async (req, res) => {
        try {
            // Extract product tag ID from the request parameters
            const productTagId = req.params.id;
            const { name, isPublished } = req.body;
            // Check if the product tag exists
            const existingProductTag = await ProductTag.findById(productTagId);
            if (!existingProductTag) {
                return res.json({ error: 'Product tag not found', status: 404 });
            }
            // Update the product tag
            existingProductTag.name = name;
            existingProductTag.isPublished = isPublished;
            existingProductTag.updatedAt = new Date();
            // Save the updated product tag to the database
            await existingProductTag.save();
            // Respond with success message
            return res.json({ message: 'Product tag updated successfully', productTag: existingProductTag, status: 201 });
        } catch (error) {
            // Handle errors
            console.error('Error updating product tag:', error);
            // Respond with error message and status code 500 for internal server error 
            return res.json({ error: 'Internal server error', status: 500 });
        }
    },
    publishProductTag: async (req, res) => {
        try {
            // Extract product tag ID from the request parameters
            const productTagId = req.params.id;

            const updatedProductTag = await ProductTag.findByIdAndUpdate(productTagId, { isPublished: req.body.isPublished });
            return res.json({ message: 'updated', updatedProductTag, status: 201 });

        } catch (error) {
            console.error('Error publishing product tag:', error);
            return res.json({ error: 'Internal server error', status: 500 });
        }
    }
};

module.exports = productTagsController;