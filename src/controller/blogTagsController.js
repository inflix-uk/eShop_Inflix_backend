// controller/blogtagsController.js
const db = require("../../connections/mongo"); // Import MongoDB connection module// Import necessary modules
const User = require("../models/blog");
const bcrypt = require("bcrypt");
const BlogTag = require("../models/blogTags");

const multer = require('multer');
const moment = require("moment");
const path = require("path");

const fs = require('fs');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const destinationFolder = './uploads/blogTag';
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



// Multer configuration for image uploads
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, './uploads/blogTag'); // Specify the destination directory for storing images
//     },
//     filename: function (req, file, cb) {
//         // Rename the uploaded file to include the current timestamp to avoid filename conflicts
//         const timestamp = moment().format('YYYYMMDD_HHmmss_');
//         const extension = path.extname(file.originalname); // Extract file extension
//         cb(null, timestamp + file.originalname); // Generate the new filename
//     }
// });

// Initialize multer with the storage configuration for blog image
const uploadTagImage = multer({ storage: storage }).single('metaImage');
// Initialize multer with the storage configuration for meta image





const blogTagsController = {


    // Define the route for creating a new blog tag
    createBlogTag: async (req, res) => {
        try {
            // Upload tag image
            uploadTagImage(req, res, async function (err) {
                if (err instanceof multer.MulterError) {
                    // Handle Multer errors
                    console.error('Multer error:', err);
                    return res.json({ error: 'Error uploading tag image', status: 400 });
                } else if (err) {
                    // Handle other errors
                    console.error('Error uploading tag image:', err);
                    return res.json({ error: 'Failed to upload tag image', status: 500 });
                }
    
                // Extract data from the request body
                const { name, shortDescription, metaTitle, metaDescription, isPublish, blogTag } = req.body;
    
                // Ensure blogTag is a string
                const tag = Array.isArray(blogTag) ? blogTag[0] : blogTag;
    
                // Extract the filename and path of the uploaded tag image
                const tagImage = req.file ? { filename: req.file.originalname, path: req.file.path } : null;
    
                // Create a new blog tag instance
                const newBlogTag = new BlogTag({
                    name, shortDescription, metaTitle, metaImage: tagImage, metaDescription, isPublish,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    blogTag: tag // Assign the tag here
                });
    
                // Save the blog tag to the database
                const savedBlogTag = await newBlogTag.save();
    
                // Respond with success message and the created blog tag
                return res.json({ message: "Blog tag created successfully", status: 201, tag: savedBlogTag });
            });
        } catch (error) {
            // Handle errors
            console.error('Error creating blog tag:', error);
            // Respond with error message and status code 500 for internal server error
            return res.json({ message: 'Internal server error', status: 500 });
        }
    },
    






    // // Define the route for creating a new blog tag
    // createBlogTag: async (req, res) => {
    //     try {
    //         // Extract data from the request body
    //         const { name, shortDescription, metaTitle, metaImage, metaDescription, isPublish } = req.body;

    //         // Create a new blog tag instance
    //         const newBlogTag = new BlogTag({
    //             name, shortDescription, metaTitle, metaImage, metaDescription, isPublish,
    //             createdAt: new Date(),
    //             updatedAt: new Date()
    //         });

    //         // Save the blog tag to the database
    //         const savedBlogTag = await newBlogTag.save();

    //         // Respond with success message and the created blog tag
    //         // res.status(201).json({ message: 'Blog tag created successfully', tag: savedBlogTag });
    //         return res.json({ message: "Blog tag created successfully", status: 201, tag: savedBlogTag });

    //     } catch (error) {
    //         // Handle errors
    //         console.error('Error creating blog tag:', error);
    //         // Respond with error message and status code 500 for internal server error
    //         return res.json({ message: 'Internal server error', status: 500 });
    //     }
    // },

    // Define the route for getting a blog
    getAllBlogTag: async (req, res) => {
        try {
            // Import the BlogTag model
            const BlogTag = require('../models/blogTags');

            // Fetch all tags from the database
            const tags = await BlogTag.find();
            console.log(tags);
            // Respond with the list of tags
            res.json({ message: 'Tags retrieved ', tags, status: 201 });

        } catch (error) {
            // Handle errors
            console.error('Error fetching tags:', error);
            return res.json({ message: 'Internal server error', status: 500 });

        }
    },

    // Define the route for delete a Blog Tag
    deleteBlogTag: async (req, res) => {

        try {
            // Extract the tag ID from the request parameters
            const { id } = req.params;

            // Find the tag by ID and delete it
            const deletedTag = await BlogTag.findByIdAndDelete(id);

            if (!deletedTag) {
                return res.json({ message: 'Tag not found', status: 404 });
            }

            return res.json({ message: 'Tag deleted successfully', status: 201 });
        } catch (error) {
            console.error('Error deleting tag:', error);
            return res.json({ message: 'Internal server error', status: 500 });
        }


    },
    // define the route for update a Blog Tag
    updateBlogTag: async (req, res) => {
        try {
            // Extract tag id and updated data from the request body
            const { id } = req.params;
            const { name, shortDescription, metaTitle, metaImage, metaDescription, isPublish } = req.body;

            // Find the blog tag by id and update its data
            const updatedTag = await BlogTag.findByIdAndUpdate(id, {
                name,
                shortDescription,
                metaTitle,
                metaImage,
                metaDescription,
                isPublish,
                updatedAt: Date.now() // Update the updatedAt field with the current timestamp
            }, { new: true }); // Set { new: true } to return the updated document

            // Check if the tag was found and updated successfully
            if (!updatedTag) {
                return res.status(404).json({ message: 'Blog tag not found', status: 404 });
            }

            // Respond with success message and the updated tag
            return res.json({ message: 'Blog tag updated successfully', status: 201, tag: updatedTag });
        } catch (error) {
            console.error('Error updating blog tag:', error);
            return res.json({ message: 'Internal server error', status: 500 });
        }
    },

    // Define the route for publish a Blog Tag
    publishBlogTag: async (req, res) => {
        try {
            // Extract the tag ID from the request parameters
            const tagId = req.params.id;

            // Find the tag in the database based on the ID
            const tag = await BlogTag.findById(tagId);

            // Check if the tag exists
            if (!tag) {
                return res.json({ message: 'Tag not found', status: 404 });
            }

            // Set the isPublish property of the tag to 1 (published)
            tag.isPublish = req.body.isPublish;

            // Save the updated tag back to the database
            const updatedTag = await tag.save();

            // Return a success message along with the updated tag
            return res.json({ message: 'Tag published successfully', status: 201, tag: updatedTag });
        } catch (error) {
            // Log error
            console.error('Error publishing tag:', error);
            // Return error response
            return res.status(500).json({ error: 'Failed to publish tag', status: 500 });
        }
    }

};

module.exports = blogTagsController;

