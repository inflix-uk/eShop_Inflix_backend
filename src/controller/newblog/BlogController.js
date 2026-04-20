const { Blog } = require('../../models/newblog/newBlog');
const Category = require('../../models/blogCategory');
const multer = require('multer');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const blobStorage = require('../../utils/blobStorage');
require('dotenv').config();

// Check if we should use Blob storage (Vercel) or local disk storage (development)
const useBlobStorage = blobStorage.isConfigured();

// Memory storage for Vercel Blob uploads
const memoryStorage = multer.memoryStorage();

// Configure multer for file uploads (disk storage for local storage)
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const destinationFolder = './uploads/blogs';
    // Create directory if it doesn't exist
    fs.mkdirSync(destinationFolder, { recursive: true });
    cb(null, destinationFolder);
  },
  filename: function (req, file, cb) {
    // Rename file with timestamp to avoid conflicts
    const timestamp = moment().format('YYYYMMDD_HHmmss_');
    const extension = path.extname(file.originalname);
    cb(null, timestamp + Date.now() + extension);
  }
});

// File filter: block uploads can be images or video widget files
const fileFilter = (req, file, cb) => {
  const nameOk =
    file.originalname.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm|ogv|ogg)$/i);
  const mimeOk =
    (file.mimetype && file.mimetype.startsWith('image/')) ||
    (file.mimetype && file.mimetype.startsWith('video/'));
  if (nameOk || mimeOk) {
    return cb(null, true);
  }
  return cb(new Error('Only image or video files are allowed!'), false);
};

const BLOCK_IMAGE_SLOT_COUNT = 40;
const multerBlockImageFields = Array.from({ length: BLOCK_IMAGE_SLOT_COUNT }, (_, i) => ({
  name: `blockImages_${i}`,
  maxCount: 1,
}));

const upload = multer({
  storage: useBlobStorage ? memoryStorage : diskStorage,
  limits: { fileSize: 80 * 1024 * 1024 }, // 80MB (block videos)
  fileFilter: fileFilter
}).fields([
  { name: 'featuredImage', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 },
  ...multerBlockImageFields,
]);

/**
 * Replace __FILE_REFERENCE__n__ in image blocks and slider widget slide imageUrls.
 */
function replaceFileReferenceInBlocks(blocks, placeholder, fileUrl) {
  if (!Array.isArray(blocks)) return false;
  for (const row of blocks) {
    if (!row.columns || !Array.isArray(row.columns)) continue;
    for (const column of row.columns) {
      if (!column.blocks || !Array.isArray(column.blocks)) continue;
      for (const block of column.blocks) {
        if (!block) continue;
        if (block.type === 'image' && block.content && block.content.url === placeholder) {
          block.content.url = fileUrl;
          return true;
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'slider' &&
          Array.isArray(block.content.slides)
        ) {
          for (const slide of block.content.slides) {
            if (slide && slide.imageUrl === placeholder) {
              slide.imageUrl = fileUrl;
              return true;
            }
          }
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'newsletter' &&
          block.content.imageUrl === placeholder
        ) {
          block.content.imageUrl = fileUrl;
          return true;
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'video' &&
          block.content.videoUrl === placeholder
        ) {
          block.content.videoUrl = fileUrl;
          return true;
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'gallery' &&
          Array.isArray(block.content.items)
        ) {
          for (const gi of block.content.items) {
            if (gi && gi.imageUrl === placeholder) {
              gi.imageUrl = fileUrl;
              return true;
            }
          }
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'testimonials' &&
          Array.isArray(block.content.items)
        ) {
          for (const ti of block.content.items) {
            if (ti && ti.avatarUrl === placeholder) {
              ti.avatarUrl = fileUrl;
              return true;
            }
          }
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'siteBanners' &&
          Array.isArray(block.content.items)
        ) {
          for (const bi of block.content.items) {
            if (!bi) continue;
            for (const field of ['imageLarge', 'imageSmall', 'extraImage']) {
              if (bi[field] === placeholder) {
                bi[field] = fileUrl;
                return true;
              }
            }
          }
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'categoryCards' &&
          Array.isArray(block.content.items)
        ) {
          for (const ci of block.content.items) {
            if (!ci) continue;
            for (const field of ['backgroundImage', 'categoryImage']) {
              if (ci[field] === placeholder) {
                ci[field] = fileUrl;
                return true;
              }
            }
          }
        }
        if (block.type === 'widget' && block.content && block.content.widgetType === 'promotionalSections') {
          const c = block.content;
          if (c.buyNowPayLater) {
            if (c.buyNowPayLater.backgroundImage === placeholder) {
              c.buyNowPayLater.backgroundImage = fileUrl;
              return true;
            }
            if (Array.isArray(c.buyNowPayLater.paymentImages)) {
              for (let pi = 0; pi < c.buyNowPayLater.paymentImages.length; pi++) {
                if (c.buyNowPayLater.paymentImages[pi] === placeholder) {
                  c.buyNowPayLater.paymentImages[pi] = fileUrl;
                  return true;
                }
              }
            }
          }
          if (c.sellBuyCards?.sellCard) {
            const s = c.sellBuyCards.sellCard;
            if (s.backgroundImage === placeholder) {
              s.backgroundImage = fileUrl;
              return true;
            }
            if (s.productImage === placeholder) {
              s.productImage = fileUrl;
              return true;
            }
          }
          if (c.sellBuyCards?.buyCard) {
            const b = c.sellBuyCards.buyCard;
            if (b.backgroundImage === placeholder) {
              b.backgroundImage = fileUrl;
              return true;
            }
            if (b.productImage === placeholder) {
              b.productImage = fileUrl;
              return true;
            }
          }
          if (c.tinyPhoneBanner) {
            const t = c.tinyPhoneBanner;
            if (t.backgroundImage === placeholder) {
              t.backgroundImage = fileUrl;
              return true;
            }
            if (t.centerImage === placeholder) {
              t.centerImage = fileUrl;
              return true;
            }
            if (t.rightImage === placeholder) {
              t.rightImage = fileUrl;
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

// Helper function to upload file to Blob storage
async function uploadToBlob(file, folder = 'blogs') {
  if (!file) return null;
  try {
    const result = await blobStorage.uploadFile(file, folder);
    return result ? result.url : null;
  } catch (error) {
    console.error('Error uploading to blob:', error);
    return null;
  }
}

// Helper to get the relative URL for the uploaded file (for local disk storage)
function getFileUrl(file) {
  if (!file) return null;
  const relativePath = path.relative('./uploads', file.path).replace(/\\/g, '/');
  return `/${relativePath}`; // Return path starting with /
}

// Helper to set a nested value given a string path like 'blocks[0][columns][1][blocks][0][content][url]'
function setNestedValue(obj, path, value) {
  const pathParts = path.replace(/\]/g, '').split(/\[|\./);
  let curr = obj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const key = pathParts[i];
    if (!(key in curr)) curr[key] = {};
    curr = curr[key];
  }
  curr[pathParts[pathParts.length - 1]] = value;
}

// Middleware to handle file uploads for blog posts
const handleBlogUpload = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      return res.status(400).json({
        success: false,
        message: 'File upload error',
        error: err.message
      });
    } else if (err) {
      // An unknown error occurred when uploading
      return res.status(500).json({
        success: false,
        message: 'Unknown upload error',
        error: err.message
      });
    }
    // Everything went fine
    next();
  });
};

/** Detailed server-side logging for blog create/update failures */
function logBlogPostError(contextLabel, error) {
  console.error(contextLabel, error);
  if (error?.message) console.error(`${contextLabel} — message:`, error.message);
  if (error?.errors) console.error(`${contextLabel} — mongoose validation:`, error.errors);
  if (error?.code) {
    console.error(`${contextLabel} — mongo:`, {
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
  }
  if (error?.stack) console.error(`${contextLabel} — stack:\n`, error.stack);
}

/**
 * Creates a new blog post
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const createBlogPost = async (req, res) => {
  try {
    // Log the complete request information
    console.log('\n--- COMPLETE BLOG POST REQUEST ---');
    console.log('Files received:', req.files);
    console.log('Body data keys:', JSON.stringify(req.body));
    
    // Parse the blogData from the form
    let blogData;
    if (req.body.blogData) {
      try {
        blogData = JSON.parse(req.body.blogData);
        console.log('Successfully parsed blogData JSON');
      } catch (e) {
        console.error('Error parsing blogData JSON:', e);
        blogData = req.body;
      }
    } else {
      // If no blogData field, use the entire body
      blogData = req.body;
    }
    
    // Parse blocks field if it's a string
    if (typeof blogData.blocks === 'string') {
      try {
        blogData.blocks = JSON.parse(blogData.blocks);
        console.log('Successfully parsed blocks JSON');
      } catch (e) {
        console.error('Error parsing blocks JSON:', e);
        // Keep as string if parsing fails
      }
    }
    
    // Process any block images
    const blockImageCount = parseInt(blogData.blockImageCount || '0', 10);
    console.log(`Processing ${blockImageCount} block images`);

    if (blockImageCount > 0) {
      // Process each block image
      for (let i = 0; i < blockImageCount; i++) {
        const imageField = `blockImages_${i}`;
        const pathField = `blockImagePath_${i}`;
        const pathInfo = blogData[pathField];

        if (req.files && req.files[imageField] && req.files[imageField].length > 0) {
          const file = req.files[imageField][0];
          console.log(`Processing block image ${i}:`, file.originalname);

          // Get the file URL for the uploaded file (use blob or local storage)
          let fileUrl;
          if (useBlobStorage) {
            fileUrl = await uploadToBlob(file, 'blogs/blocks');
          } else {
            fileUrl = getFileUrl(file);
          }

          try {
            const placeholder = `__FILE_REFERENCE__${i}__`;

            if (Array.isArray(blogData.blocks)) {
              const replacementMade = replaceFileReferenceInBlocks(
                blogData.blocks,
                placeholder,
                fileUrl
              );
              if (replacementMade) {
                console.log(`Replaced ${placeholder} with ${fileUrl}`);
              } else {
                console.warn(`Could not find placeholder ${placeholder} to replace with ${fileUrl}`);
              }
            } else {
              console.error('blogData.blocks is not an array:', typeof blogData.blocks);
            }
          } catch (error) {
            console.error('Error updating block image URL:', error);
          }
        } else {
          console.log(`No file found for block image ${i}`);
        }
      }
    }

    // Handle file uploads - use Blob storage or local storage
    if (req.files) {
      if (req.files.featuredImage && req.files.featuredImage[0]) {
        const featuredImageFile = req.files.featuredImage[0];
        console.log('Uploading featured image:', featuredImageFile.originalname, featuredImageFile.size);
        if (useBlobStorage) {
          blogData.featuredImage = await uploadToBlob(featuredImageFile, 'blogs/featured');
        } else {
          blogData.featuredImage = getFileUrl(featuredImageFile);
        }
      }

      if (req.files.bannerImage && req.files.bannerImage[0]) {
        const bannerImageFile = req.files.bannerImage[0];
        console.log('Uploading banner image:', bannerImageFile.originalname, bannerImageFile.size);
        if (useBlobStorage) {
          blogData.bannerImage = await uploadToBlob(bannerImageFile, 'blogs/banners');
        } else {
          blogData.bannerImage = getFileUrl(bannerImageFile);
        }
      }
    }
    
    // Clean up any temporary fields used for block images processing
    if (blogData.blockImageCount) {
      const blockImageCount = parseInt(blogData.blockImageCount, 10);
      delete blogData.blockImageCount;
      
      for (let i = 0; i < blockImageCount; i++) {
        if (blogData[`blockImagePath_${i}`]) {
          delete blogData[`blockImagePath_${i}`];
        }
      }
    }
    
    console.log('Final blog data for saving:', JSON.stringify(blogData, null, 2));
    
    // Validate category IDs
    if (blogData.categories && Array.isArray(blogData.categories)) {
      // Ensure all category IDs are valid
      const categoryIds = blogData.categories;
      const validCategories = await Category.find({ _id: { $in: categoryIds } });
      
      if (validCategories.length !== categoryIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more category IDs are invalid'
        });
      }
    }
    
    // Create a new blog post instance
    const newBlog = new Blog(blogData);
    
    // Save to database
    await newBlog.save();
    
    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: newBlog
    });
  } catch (error) {
    logBlogPostError('[createBlogPost]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create blog post',
      error: error.message
    });
  }
};

/**
 * Updates an existing blog post with file uploads
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const updateBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Parse the blog data from the request
    let blogData;
    if (req.body.blogData) {
      // If data was sent as FormData with files
      blogData = JSON.parse(req.body.blogData);
    } else {
      // If data was sent as JSON without files
      blogData = req.body;
    }
    console.log('Blog data received for update:', blogData);
    console.log('Files received for update:', req.files);
    
    // Parse blocks field if it's a string
    if (typeof blogData.blocks === 'string') {
      try {
        blogData.blocks = JSON.parse(blogData.blocks);
        console.log('Successfully parsed blocks JSON');
      } catch (e) {
        console.error('Error parsing blocks JSON:', e);
        // Keep as string if parsing fails
      }
    }

    // Process any block images
    const blockImageCount = parseInt(blogData.blockImageCount || '0', 10);
    console.log(`Processing ${blockImageCount} block images for update`);

    if (blockImageCount > 0) {
      // Process each block image
      for (let i = 0; i < blockImageCount; i++) {
        const imageField = `blockImages_${i}`;
        const pathField = `blockImagePath_${i}`;
        const pathInfo = blogData[pathField];

        if (req.files && req.files[imageField] && req.files[imageField].length > 0) {
          const file = req.files[imageField][0];
          console.log(`Processing block image ${i}:`, file.originalname);

          // Get the file URL for the uploaded file (use blob or local storage)
          let fileUrl;
          if (useBlobStorage) {
            fileUrl = await uploadToBlob(file, 'blogs/blocks');
          } else {
            fileUrl = getFileUrl(file);
          }

          try {
            const placeholder = `__FILE_REFERENCE__${i}__`;

            if (Array.isArray(blogData.blocks)) {
              const replacementMade = replaceFileReferenceInBlocks(
                blogData.blocks,
                placeholder,
                fileUrl
              );
              if (replacementMade) {
                console.log(`Replaced ${placeholder} with ${fileUrl}`);
              } else {
                console.warn(`Could not find placeholder ${placeholder} to replace with ${fileUrl}`);
              }
            } else {
              console.error('blogData.blocks is not an array:', typeof blogData.blocks);
            }
          } catch (error) {
            console.error('Error updating block image URL:', error);
          }
        } else {
          console.log(`No file found for block image ${i}`);
        }
      }
    }

    // Handle file uploads - use Blob storage or local storage
    if (req.files) {
      if (req.files.featuredImage && req.files.featuredImage[0]) {
        const featuredImageFile = req.files.featuredImage[0];
        console.log('Uploading featured image:', featuredImageFile.originalname, featuredImageFile.size);
        if (useBlobStorage) {
          blogData.featuredImage = await uploadToBlob(featuredImageFile, 'blogs/featured');
        } else {
          blogData.featuredImage = getFileUrl(featuredImageFile);
        }
      }

      if (req.files.bannerImage && req.files.bannerImage[0]) {
        const bannerImageFile = req.files.bannerImage[0];
        console.log('Uploading banner image:', bannerImageFile.originalname, bannerImageFile.size);
        if (useBlobStorage) {
          blogData.bannerImage = await uploadToBlob(bannerImageFile, 'blogs/banners');
        } else {
          blogData.bannerImage = getFileUrl(bannerImageFile);
        }
      }
    }
    
    // Clean up any temporary fields used for block images processing
    if (blogData.blockImageCount) {
      const blockImageCount = parseInt(blogData.blockImageCount, 10);
      delete blogData.blockImageCount;
      
      for (let i = 0; i < blockImageCount; i++) {
        if (blogData[`blockImagePath_${i}`]) {
          delete blogData[`blockImagePath_${i}`];
        }
      }
    }
    
    // Validate category IDs if provided
    if (blogData.categories && Array.isArray(blogData.categories)) {
      // Ensure all category IDs are valid
      const categoryIds = blogData.categories;
      const validCategories = await Category.find({ _id: { $in: categoryIds } });
      
      if (validCategories.length !== categoryIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more category IDs are invalid'
        });
      }
    }

    // Strip non-schema / upload helper keys; partial tab-wise updates only $set defined fields
    const allowedFields = new Set([
      'title', 'slug', 'content', 'excerpt', 'blocks', 'categories', 'tags',
      'publishStatus', 'publishDate', 'metaTitle', 'metaDescription', 'metaTags',
      'metaSchema', 'featuredImage', 'featuredImageAlt', 'featuredImageDescription',
      'bannerImage', 'bannerImageAlt', 'bannerImageDescription', 'newBlog'
    ]);
    delete blogData.id;
    delete blogData._id;
    delete blogData.__v;
    for (let i = 0; i < BLOCK_IMAGE_SLOT_COUNT; i++) {
      delete blogData[`blockImages_${i}`];
      delete blogData[`blockImagePath_${i}`];
    }

    const $set = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(blogData, key) && blogData[key] !== undefined) {
        $set[key] = blogData[key];
      }
    }

    if (Object.keys($set).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    $set.updatedAt = new Date();

    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      { $set },
      { new: true, runValidators: true }
    );
    
    if (!updatedBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      data: updatedBlog
    });
  } catch (error) {
    logBlogPostError('[updateBlogPost]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blog post',
      error: error.message
    });
  }
};

/**
 * Gets a blog post by ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getBlogPostById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blogPost = await Blog.findById(id).populate('categories');
    
    if (!blogPost) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: blogPost
    });
  } catch (error) {
    console.error('Error getting blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get blog post',
      error: error.message
    });
  }
};

/**
 * Gets all blog posts with optional filtering
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getAllBlogPosts = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { status, category, tag, page = 1, limit = 10 } = req.query;
    
    // Build query object based on filters
    const query = {};
    if (status) query.publishStatus = status;
    if (category) query.categories = category; // This will work with ObjectId as well
    if (tag) query.tags = tag;
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination info
    const total = await Blog.countDocuments(query);
    
    // Get blog posts with pagination and select only required fields
    const blogPosts = await Blog
      .find(query)
      .select({
        title: 1,
        slug: 1,
        excerpt: 1,
        featuredImage: 1,
        featuredImageAlt: 1,
        featuredImageDescription: 1,
        bannerImage: 1,
        bannerImageAlt: 1,
        bannerImageDescription: 1,
        categories: 1,
        tags: 1,
        author: 1,
        status: 1,
        views: 1,
        publishStatus: 1,
        createdAt: 1,
        updatedAt: 1
      })
      .populate('categories') // Populate category data
      .sort({ updatedAt: -1 }) // Latest first by update date
      .skip(skip)
      .limit(parseInt(limit));
    
    // Format the response with only necessary data
    const formattedPosts = blogPosts.map(post => ({
      _id: post._id,
      title: post.title,
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      featuredImage: post.featuredImage || '',
      featuredImageAlt: post.featuredImageAlt || '',
      featuredImageDescription: post.featuredImageDescription || '',
      bannerImage: post.bannerImage || '',
      bannerImageAlt: post.bannerImageAlt || '',
      bannerImageDescription: post.bannerImageDescription || '',
      categories: post.categories || [],
      author: post.author || '',
      status: post.status || 'draft',
      views: post.views || 0,
      publishStatus: post.publishStatus || 'draft',
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    }));
    
    
    res.status(200).json({
      success: true,
      data: formattedPosts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting blog posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get blog posts',
      error: error.message
    });
  }
};

/**
 * Deletes a blog post 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const deleteBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Blog.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog post',
      error: error.message
    });
  }
};

const { getBlogPostBySlugCache } = require('../../../cache/newBlogCache');

const getBlogPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { data: post, fromCache } = await getBlogPostBySlugCache(
      `blog:${slug}`,
      async () => await Blog.findOne({ slug })
        .populate({
          path: 'categories',
          select: 'name shortDescription metaTitle metaDescription isFeatured isPublish',
          model: 'NewBlogCategory'
        })
        .lean()
    );
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: post,
      fromCache
    });
  } catch (error) {
    console.error('Error getting blog post by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get blog post by slug',
      error: error.message
    });
  }
};


const getBlogPostBySlugWithoutCache = async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await Blog.findOne({ slug })
      .populate({
        path: 'categories',
        select: 'name shortDescription metaTitle metaDescription isFeatured isPublish',
        model: 'BlogCategory'
      })
      .lean();
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error getting blog post by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get blog post by slug',
      error: error.message
    });
  }
};
module.exports = {
  createBlogPost,
  updateBlogPost,
  getBlogPostById,
  getAllBlogPosts,
  deleteBlogPost,
  getBlogPostBySlug,
  getBlogPostBySlugWithoutCache,
  handleBlogUpload
};