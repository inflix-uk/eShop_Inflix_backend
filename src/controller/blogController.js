// controller/users.js
const db = require("../../connections/mongo"); // Import MongoDB connection module// Import necessary modules
const Blog = require("../models/blog");
const { Blog: NewBlog } = require("../models/newblog/newBlog");
const blogTag = require("../models/blogTags");
const BlogCategory = require('../models/blogCategory');


const multer = require('multer');
const moment = require("moment");
const path = require("path");
const fs = require('fs');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const destinationFolder = './uploads/blog';
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




const upload = multer({ storage: storage }).fields([
    { name: 'blogImage', maxCount: 1 },
    { name: 'metaImage', maxCount: 1 },
    { name: 'blogthumbnailImage', maxCount: 1 }

]);

const blogController = {
    createBlog: async (req, res) => {
        try {
            // Upload both blog and meta images
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
                const {
                    name, content, content1, permalink, blogShortDescription, metaTitle, metaDescription, visibility,
                    publishAt, user, isFeatured, createdAt, updatedAt, deletedAt, blogTags, blogCategory,
                    metakeywords, metaImageAlt, blogImageAlt, blogthumbnailImageAlt, metaSchemas, blogpublisheddate, selectedProducts
                } = req.body;
    
                console.log(req.body);
                console.log(req.files);
              
  
    
                // Extract the filenames and paths of the uploaded images
                const blogImage = req.files['blogImage'] ? req.files['blogImage'][0].path : null;
                const metaImage = req.files['metaImage'] ? req.files['metaImage'][0].path : null;
                const thumbnailImage = req.files['blogthumbnailImage'] ? req.files['blogthumbnailImage'][0].path : null;

    
                // Convert metaschemas into an array (already a string, so we just split it)
                // const metaschemasArray = metaschemas.split('}",').map(schema => schema.trim());
    
                // Create a new blog instance
                const newBlog = new Blog({
                    name, 
                    content, 
                    content1,
                    selectedProducts: selectedProducts || [],
                    permalink, 
                    blogShortDescription, 
                    metaTitle, 
                    metaDescription, 
                    visibility,
                    publishAt, 
                    user, 
                    isFeatured, 
                    createdAt: new Date(),  // This line is updated
                    deletedAt, 
                    blogTags, 
                    blogCategory,
                    blogpublisheddate,
                    blogImage, 
                    metaImage, 
                    thumbnailImage, 
                    blogthumbnailImageAlt, 
                    blogImageAlt, 
                    metaImageAlt,
                    metakeywords,
                    metaschemas: metaSchemas
                });
    
                // Save the blog to the database
                const savedBlog = await newBlog.save();
    
                // Return success response
                return res.json({ message: "Blog created successfully", status: 201, blog: savedBlog });
            });
        } catch (error) {
            // Log error
            console.error('Error creating blog:', error);
            // Return error response
            return res.json({ error: 'Failed to create blog', status: 500 });
        }
    },
    
    
    
    updateBlog: async (req, res) => {
        try {
            const { id } = req.params;
    
            // Upload both blog and meta images
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
    
                console.log(req.files);  // Log files to ensure they are being uploaded
                console.log(req.body);   // Log form data to ensure all fields are coming in
               
    
                // Extract the form data from req.body
                const {
                    name, content, content1, permalink, blogShortDescription, metaTitle, metaDescription, visibility, 
                    publishAt, user, isFeatured, blogTags, blogpublisheddate, selectedProducts,
                    blogCategory, metaSchemas, metaImageAlt, blogImageAlt, blogthumbnailImageAlt, metakeywords
                } = req.body;

                console.log(req.body);
                
                
    
                // Convert metaschemas from a comma-separated string to an array
                // const metaschemasArray = metaschemas ? metaschemas.split(',').map(item => item.trim()) : [];
    
                // Find the existing blog by id
                let existingBlog = await Blog.findById(id);
                if (!existingBlog) {
                    return res.json({ message: 'Blog not found', status: 404 });
                }
    
                // Extract the uploaded image paths from req.files (if new images were uploaded)
                const blogImage = req.files && req.files['blogImage'] ? req.files['blogImage'][0].path : existingBlog.blogImage;
                const metaImage = req.files && req.files['metaImage'] ? req.files['metaImage'][0].path : existingBlog.metaImage;
                const thumbnailImage = req.files && req.files['blogthumbnailImage'] ? req.files['blogthumbnailImage'][0].path : existingBlog.thumbnailImage;
    
                const parseBool = (v) => {
                    if (v === true || v === 'true' || v === '1') return true;
                    if (v === false || v === 'false' || v === '0') return false;
                    return Boolean(v);
                };

                // Partial updates: only assign fields present in the body (multi-step blog create / PATCH).
                if (name !== undefined) existingBlog.name = name;
                if (content !== undefined) existingBlog.content = content;
                if (content1 !== undefined) existingBlog.content1 = content1;
                if (selectedProducts !== undefined) {
                    existingBlog.selectedProducts = selectedProducts || [];
                }
                if (permalink !== undefined) existingBlog.permalink = permalink;
                if (blogShortDescription !== undefined) existingBlog.blogShortDescription = blogShortDescription;
                if (metaTitle !== undefined) existingBlog.metaTitle = metaTitle;
                if (metaDescription !== undefined) existingBlog.metaDescription = metaDescription;
                if (visibility !== undefined) existingBlog.visibility = parseBool(visibility);
                if (publishAt !== undefined) existingBlog.publishAt = publishAt;
                if (user !== undefined) existingBlog.user = user;
                if (blogpublisheddate !== undefined) existingBlog.blogpublisheddate = blogpublisheddate;
                if (isFeatured !== undefined) existingBlog.isFeatured = parseBool(isFeatured);
                if (blogTags !== undefined) existingBlog.blogTags = blogTags;
                if (blogCategory !== undefined) existingBlog.blogCategory = blogCategory;
                if (metaSchemas !== undefined) {
                    existingBlog.metaschemas = Array.isArray(metaSchemas) ? metaSchemas : (metaSchemas != null ? [metaSchemas] : []);
                }
                if (blogImageAlt !== undefined) existingBlog.blogImageAlt = blogImageAlt;
                if (metaImageAlt !== undefined) existingBlog.metaImageAlt = metaImageAlt;
                if (blogthumbnailImageAlt !== undefined) existingBlog.blogthumbnailImageAlt = blogthumbnailImageAlt;
                if (metakeywords !== undefined) existingBlog.metakeywords = metakeywords;

                if (req.files && req.files['blogImage']) existingBlog.blogImage = blogImage;
                if (req.files && req.files['metaImage']) existingBlog.metaImage = metaImage;
                if (req.files && req.files['blogthumbnailImage']) existingBlog.thumbnailImage = thumbnailImage;

                existingBlog.updatedAt = new Date();

                // Save the updated blog
                const updatedBlog = await existingBlog.save();
    
                // Return success response
                return res.json({ message: 'Blog updated successfully', status: 201, updatedBlog });
            });
        } catch (error) {
            // Log error
            console.error('Error updating blog:', error);
            // Return error response
            res.json({ error: 'Failed to update blog', status: 500 });
        }
    },
    

    getAllBlog: async (req, res) => {
    try {
        // Retrieve blogs from old Blog model
        const blogs = await Blog.find()
            .select('_id title author createdAt blogCategory blogpublisheddate blogthumbnailImageAlt deletedAt isFeatured name permalink thumbnailImage updatedAt visibility')
            .lean();

        // Retrieve blogs from new NewBlog model
        const newBlogs = await NewBlog.find()
            .select('_id title author createdAt categories publishDate featuredImage bannerImage tags excerpt slug publishStatus updatedAt')
            .lean();

        // Add a flag to distinguish new blogs if needed
        const newBlogsWithFlag = newBlogs.map(blog => ({ ...blog, isNewBlog: true }));

        // Merge and sort by createdAt descending
        const combinedBlogs = [...blogs, ...newBlogsWithFlag].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Return success response
        return res.json({
            message: "Blogs fetched successfully",
            status: 201,
            data: combinedBlogs
        });
    } catch (error) {
        // Log the error for debugging
        console.error('Error fetching blogs:', error);

        // Return error response with status
        return res.status(500).json({
            error: 'Failed to fetch blogs',
            status: 500
        });
    }
    },

    getAllBlogFull: async (req, res) => {
        try {
            // Retrieve blogs from old Blog model
            const blogs = await Blog.find()
                .select('_id title author createdAt blogCategory blogpublisheddate blogthumbnailImageAlt deletedAt isFeatured name permalink thumbnailImage updatedAt visibility')
                .lean();

            // Retrieve blogs from new NewBlog model
            const newBlogs = await NewBlog.find()
                .select('_id title author createdAt categories publishDate featuredImage featuredImageAlt featuredImageDescription bannerImage bannerImageAlt bannerImageDescription excerpt slug publishStatus updatedAt')
                .populate({ path: 'categories', select: 'name _id' })
                .lean();

            // Add a flag to distinguish new blogs if needed
            const newBlogsWithFlag = newBlogs.map(blog => ({ ...blog, isNewBlog: true }));

            // Merge and sort by createdAt descending
            const combinedBlogs = [...blogs, ...newBlogsWithFlag].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // Return all blogs, not just latest 10
            return res.json({
                message: "Blogs fetched successfully",
                status: 201,
                data: combinedBlogs
            });
        } catch (error) {
            // Log the error for debugging
            console.error('Error fetching blogs:', error);

            // Return error response with status
            return res.status(500).json({
                error: 'Failed to fetch blogs',
                status: 500
            });
        }
    },
    getAllBlogLatest: async (req, res) => {
        try {
            // Retrieve blogs from old Blog model
            const blogs = await Blog.find()
                .select('_id title author createdAt blogCategory blogpublisheddate blogthumbnailImageAlt deletedAt isFeatured name permalink thumbnailImage updatedAt visibility')
                .lean();

            // Retrieve blogs from new NewBlog model
            const newBlogs = await NewBlog.find({ publishStatus: "published" })
                .select('_id title author createdAt categories publishDate featuredImage featuredImageAlt featuredImageDescription bannerImage bannerImageAlt bannerImageDescription excerpt slug publishStatus updatedAt')
                .populate({ path: 'categories', select: 'name _id' })
                .lean();

            // Add a flag to distinguish new blogs if needed
            const newBlogsWithFlag = newBlogs.map(blog => ({ ...blog, isNewBlog: true }));

            // Merge and sort by createdAt descending
            const combinedBlogs = [...blogs, ...newBlogsWithFlag].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // Take only the latest 10 blogs
            const latestBlogs = combinedBlogs.slice(0, 10);

            // Return success response
            return res.json({
                message: "Blogs fetched successfully",
                status: 201,
                data: latestBlogs
            });
        } catch (error) {
            // Log the error for debugging
            console.error('Error fetching blogs:', error);

            // Return error response with status
            return res.status(500).json({
                error: 'Failed to fetch blogs',
                status: 500
            });
        }
    },

    getAllBlogLatestOnlyOld: async (req, res) => {
        try {
            // Retrieve only from old Blog model
            const blogs = await Blog.find()
                .select('_id title author createdAt blogCategory blogpublisheddate blogthumbnailImageAlt deletedAt isFeatured name permalink thumbnailImage updatedAt visibility')
                .sort({ createdAt: -1 }) // Sort by createdAt in descending order (newest first)
                .limit(10) // Limit to 10 most recent blogs
                .lean();

            // Return success response with only old blogs
            return res.json({
                message: "Blogs fetched successfully",
                status: 201,
                data: blogs
            });
        } catch (error) {
            // Log the error for debugging
            console.error('Error fetching blogs:', error);

            // Return error response with status
            return res.status(500).json({
                error: 'Failed to fetch blogs',
                status: 500
            });
        }
    },

    deleteBlog: async (req, res) => {
        try {
            // Extract the id parameter from the request URL
            const { id } = req.params;

            // Find the blog in the database by id and delete it
            const deletedBlog = await Blog.findByIdAndDelete(id);

            if (!deletedBlog) {
                return res.json({ message: 'Blog not found', status: 404 });
            }

            // Return success response
            return res.json({ message: 'Blog deleted successfully', status: 201, deletedBlog });

        } catch (error) {
            // Log error
            console.error('Error deleting blog:', error);
            // Return error response
            res.json({ error: 'Failed to delete blog', status: 500 });
        }
    },

    getBlog: async (req, res) => {
    try {
        const permalink = req.params.id;
        const blog = await Blog.findOne({ permalink });


        // Check if the blog exists
        if (!blog) {
            // If the blog is not found, return a 404 Not Found response
            return res.status(404).json({ message: 'Blog not found', status: 404 });
        }

        // If the blog is found, return it in the response
        return res.json({ message: 'Blog Retrieved', status: 201, blog });
    } catch (error) {
        // If an error occurs, log the error and return a 500 Internal Server Error response
        console.error('Error fetching blog:', error);
        return res.status(500).json({ error: 'Failed to fetch blog', status: 500 });
    }
    },


    getBlogMetaData: async (req, res) => {
        try {
            const permalink = req.params.permalink;
            const blog = await Blog.findOne({ permalink }, {_id: 1, name: 1, permalink: 1, metaTitle: 1, metaImage: 1, metaImageAlt: 1, metakeywords: 1, metaschemas: 1, metaDescription: 1});

            if (!blog) {
                // If the blog is not found, return a 404 Not Found response
                return res.status(404).json({ message: 'Blog not found', status: 404 });
            }
    
            // If the blog is found, return it in the response
            return res.json({ message: 'Blog Retrieved', status: 201, blog });
        } catch (error) {
            // If an error occurs, log the error and return a 500 Internal Server Error response
            console.error('Error fetching blog:', error);
            return res.status(500).json({ error: 'Failed to fetch blog', status: 500 });
        }
    },
    statusBlog: async (req, res) => {
        try {  
            const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, { visibility: req.body.visibility }, { new: true });
            if (!updatedBlog) return res.status(404).json({ error: "Blog not found" });
            return res.status(201).json({ message: "Blog status updated successfully", blog: updatedBlog , status: 201 });
        } catch (error) {
            console.error("Error updating blog status:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    },
    featureBlog: async (req, res) => {
        try {  
            const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, { isFeatured: req.body.isFeatured }, { new: true });
            if (!updatedBlog) return res.status(404).json({ error: "Blog not found" });
            return res.status(201).json({ message: "Blog feature updated successfully", blog: updatedBlog, status: 201 });
        } catch (error) {
            console.error("Error updating blog feature:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
};

module.exports = blogController;
