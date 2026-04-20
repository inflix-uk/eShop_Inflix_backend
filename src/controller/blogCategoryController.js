// controller/blogCategoryController.js
const db = require("../../connections/mongo"); // Import MongoDB connection module// Import necessary modules
const User = require("../models/blog");
const bcrypt = require("bcrypt");
const BlogCategory = require("../models/blogCategory");


const multer = require('multer');
const moment = require("moment");
const path = require("path");

const fs = require('fs');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const destinationFolder = './uploads/blogCategory';
        // Check if the destination folder exists
        fs.access(destinationFolder, (err) => {
            if (err) {
                // If the folder doesn't exist, create it
                fs.mkdir(destinationFolder, (err) => {
                    if (err) {
                        console.error('Error creating destination folder:', err);
                        cb(err, null);
                    } else {
                        cb(null, destinationFolder);
                    }
                });
            } else {
                // If the folder already exists, use it
                cb(null, destinationFolder);
            }
        });
    },
    filename: function (req, file, cb) {
        // Rename the uploaded file to include the current timestamp to avoid filename conflicts
        const timestamp = moment().format('YYYYMMDD_HHmmss_');
        const extension = path.extname(file.originalname); // Extract file extension
        cb(null, timestamp + file.originalname); // Generate the new filename
    }
});



// // Multer configuration for image uploads
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, './uploads/blogCategory'); // Specify the destination directory for storing images
//     },
//     filename: function (req, file, cb) {
//         // Rename the uploaded file to include the current timestamp to avoid filename conflicts
//         const timestamp = moment().format('YYYYMMDD_HHmmss_');
//         const extension = path.extname(file.originalname); // Extract file extension
//         cb(null, timestamp + file.originalname); // Generate the new filename
//     }
// });

// Initialize multer with the storage configuration for blog images
const upload = multer({ storage: storage }).fields([
    { name: 'metaImage', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
]);
// Initialize multer with the storage configuration for meta and banner images


const blogCategoryController = {


    // Define the route for creating a new blog category
    createBlogCategory: async (req, res) => {
        try {  
            // Upload images (meta and banner)
            upload(req, res, async function (err) {
                if (err instanceof multer.MulterError) {
                    // Handle Multer errors
                    console.error('Multer error:', err);
                    return res.json({ error: 'Error uploading images', status: 400 });
                } else if (err) {
                    // Handle other errors
                    console.error('Error uploading images:', err);
                    return res.json({ error: 'Failed to upload images', status: 500 });
                }
                // Extract data from the request body
                const { name, shortDescription, metaTitle, metaDescription, isFeatured, isPublish } = req.body;

                // Extract the filename and path of the uploaded meta image
                const metaImage = req.files && req.files.metaImage && req.files.metaImage[0] ? 
                    { filename: req.files.metaImage[0].originalname, path: req.files.metaImage[0].path } : null;
                
                // Extract the filename and path of the uploaded banner image
                const bannerImage = req.files && req.files.bannerImage && req.files.bannerImage[0] ? 
                    { filename: req.files.bannerImage[0].originalname, path: req.files.bannerImage[0].path } : null;

                // Create a new category instance
                const newCategory = new BlogCategory({
                    name, shortDescription, metaTitle, metaDescription, metaImage, bannerImage, isFeatured, isPublish,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                // Save the category to the database
                const savedCategory = await newCategory.save();

                // Respond with success message and the created category
                return res.json({ message: "Category created successfully", status: 201, category: savedCategory });
            });
        } catch (error) {
            // Handle errors
            console.error('Error creating category:', error);
            res.json({ message: 'Internal server error', status: 500 });
        }
    },


    // Define the route for creating a new blog category
    // createBlogCategory: async (req, res) => {
    //     try {

    //         // Extract data from the request body
    //         const { name, shortDescription, metaTitle, metaImage, metaDescription, isFeatured, isPublish } = req.body;

    //         // Create a new category instance
    //         const newCategory = new BlogCategory({
    //             name, shortDescription, metaTitle, metaImage, metaDescription, isFeatured, isPublish,
    //             createdAt: new Date(),
    //             updatedAt: new Date()
    //         });

    //         // Save the category to the database
    //         const savedCategory = await newCategory.save();

    //         // Respond with success message and the created category
    //         // res.status(201).json({ message: 'Category created successfully', category: savedCategory });
    //         return res.json({ message: "Category created successfully", status: 201, category: savedCategory });

    //     } catch (error) {
    //         // Handle errors
    //         console.error('Error creating category:', error);
    //         res.json({ message: 'Internal server error', status: 500 });
    //     }
    // },



    // Define the route for getting a blog
    getAllCategory: async (req, res) => {
        try {
          
            // Import the BlogCategory model
            const BlogCategory = require('../models/blogCategory');

            // Fetch all categories from the database
            const categories = await BlogCategory.find();
        console.log(categories);
            // Respond with the list of categories
            res.json({ message: 'Categories retrieved ', categories, status: 201 });
        } catch (error) {
            // Handle errors
            console.error('Error fetching categories:', error);
            return res.json({ message: 'Internal server error', status: 500 });
        }
    },

    // Define the route for Delete a Blog Category
    deleteBlogCategory: async (req, res) => {
        try {
            // Import the BlogCategory model

            // Extract the category ID from the request parameters
            const categoryId = req.params.id;

            // Check if the category exists
            const category = await BlogCategory.findById(categoryId);
            if (!category) {
                return res.json({ message: 'Category not found', status: 404 });
            }

            // Delete the category from the database
            await BlogCategory.findByIdAndDelete(categoryId);

            // Respond with success message
            res.json({ message: 'Category deleted successfully', status: 201 });
        } catch (error) {
            // Handle errors
            console.error('Error deleting category:', error);
            res.json({ message: 'Internal server error', status: 500 });
        }
    },

    // define the route for updating a blog category
    updateBlogCategory: async (req, res) => {
        try {
            // Upload images (meta and banner)
            upload(req, res, async function (err) {
                if (err instanceof multer.MulterError) {
                    // Handle Multer errors
                    console.error('Multer error:', err);
                    return res.json({ error: 'Error uploading images', status: 400 });
                } else if (err) {
                    // Handle other errors
                    console.error('Error uploading images:', err);
                    return res.json({ error: 'Failed to upload images', status: 500 });
                }
                
                // Extract the category ID from the request parameters
                const { id } = req.params;

                // Extract the updated category data from the request body
                const { name, shortDescription, metaTitle, metaDescription, isFeatured, isPublish } = req.body;

                // Get the existing category to preserve existing images if not updated
                const existingCategory = await BlogCategory.findById(id);
                if (!existingCategory) {
                    return res.json({ message: 'Category not found', status: 404 });
                }

                // Handle meta image update
                let metaImage = existingCategory.metaImage;
                if (req.files && req.files.metaImage && req.files.metaImage[0]) {
                    metaImage = {
                        filename: req.files.metaImage[0].originalname,
                        path: req.files.metaImage[0].path
                    };
                }

                // Handle banner image update
                let bannerImage = existingCategory.bannerImage;
                if (req.files && req.files.bannerImage && req.files.bannerImage[0]) {
                    bannerImage = {
                        filename: req.files.bannerImage[0].originalname,
                        path: req.files.bannerImage[0].path
                    };
                }

                // Find the category by ID and update it with the new data
                const updatedCategory = await BlogCategory.findByIdAndUpdate(id, {
                    name, shortDescription, metaTitle, metaDescription, metaImage, bannerImage, isFeatured, isPublish,
                    updatedAt: new Date() // Update the updatedAt field
                }, { new: true }); // Set { new: true } to return the updated document

                return res.json({ message: 'Category updated successfully', status: 201, category: updatedCategory });
            });
        } catch (error) {
            console.error('Error updating category:', error);
            return res.json({ message: 'Internal server error', status: 500 });
        }
    },


    // Define the route for updating a feature in a blog
    featureBlogCategory: async (req, res) => {
        try {
            // Extract the category ID from the request parameters
            const categoryId = req.params.id;

            // Find the category in the database based on the ID
            const category = await BlogCategory.findById(categoryId);

            // Check if the category exists
            if (!category) {
                return res.json({ message: 'Category not found', status: 404 });
            }

            // Update the isFeatured property of the category
            category.isFeatured = req.body.isFeatured; // Assuming the isFeatured value is sent in the request body

            // Save the updated category back to the database
            const updatedCategory = await category.save();

            // Return a success message along with the updated category
            return res.json({ message: 'Category feature updated successfully', status: 201, category: updatedCategory });
        } catch (error) {
            // Log error
            console.error('Error updating category feature:', error);
            // Return error response
            return res.json({ error: 'Failed to update category feature', status: 500 });
        }

    },

    // Define the route for updating a blog
    statusBlogCategory: async (req, res) => {
        try {
            // Extract the category ID from the request parameters
            const categoryId = req.params.id;

            // Find the category in the database based on the ID
            const category = await BlogCategory.findById(categoryId);

            // Check if the category exists
            if (!category) {
                return res.json({ message: 'Category not found', status: 404 });
            }

            // Update the isPublish property of the category
            category.isPublish = req.body.isPublish; // Assuming the isPublish value is sent in the request body

            // Save the updated category back to the database
            const updatedCategory = await category.save();

            // Return a success message along with the updated category
            return res.json({ message: 'Category status updated successfully', status: 201, category: updatedCategory });
        } catch (error) {
            // Log error
            console.error('Error updating category status:', error);
            // Return error response
            return res.json({ error: 'Failed to update category status', status: 500 });
        }
    },


};

module.exports = blogCategoryController;

