const FooterPage = require('../models/footerPage');
const multer = require('multer');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const blobStorage = require('../utils/blobStorage');
require('dotenv').config();

const UPLOAD_DIR = './uploads/footer-pages';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Check if we should use Blob storage (Vercel) or local disk storage (development)
const useBlobStorage = blobStorage.isConfigured();

// Memory storage for Vercel Blob uploads
const memoryStorage = multer.memoryStorage();

// Disk storage for local development
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const timestamp = moment().format('YYYYMMDD_HHmmss_');
    const extension = path.extname(file.originalname);
    cb(null, timestamp + Date.now() + extension);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create multer upload configuration with support for multiple block images
const uploadFields = [
  { name: 'bannerImage', maxCount: 1 }
];
// Add support for up to 20 block images
for (let i = 0; i < 20; i++) {
  uploadFields.push({ name: `blockImages_${i}`, maxCount: 1 });
}

const upload = multer({
  storage: useBlobStorage ? memoryStorage : diskStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
}).fields(uploadFields);

// Helper function to upload file to Blob storage
async function uploadToBlob(file, folder = 'footer-pages') {
  if (!file) return null;
  try {
    const result = await blobStorage.uploadFile(file, folder);
    return result ? result.url : null;
  } catch (error) {
    console.error('Error uploading to blob:', error);
    return null;
  }
}

// Helper function to delete file from Blob or local storage
async function deleteFile(filePath) {
  if (!filePath) return;

  if (filePath.includes('blob.vercel-storage.com') || filePath.includes('public.blob.vercel-storage.com')) {
    try {
      await blobStorage.deleteFile(filePath);
      console.log(`Deleted blob file: ${filePath}`);
    } catch (error) {
      console.error(`Error deleting blob file ${filePath}:`, error);
    }
  } else {
    try {
      const fullPath = path.join(process.cwd(), filePath.startsWith('/') ? filePath.substring(1) : filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (e) {
      console.error('Error deleting file:', e);
    }
  }
}

// Helper to get image URL from file (blob or local)
async function getImageUrl(file, folder = 'footer-pages') {
  if (!file) return null;
  if (useBlobStorage) {
    return await uploadToBlob(file, folder);
  } else {
    const relativePath = path.relative('./uploads', file.path).replace(/\\/g, '/');
    return `/uploads/${relativePath}`;
  }
}

// Helper to get the relative URL for local uploaded file
function getFileUrl(file) {
  if (!file) return null;
  const relativePath = path.relative('./uploads', file.path).replace(/\\/g, '/');
  return `/uploads/${relativePath}`;
}

// Helper function to convert data URL to file object or save locally
async function processDataUrl(dataUrl, filename, folder = 'footer-pages') {
  try {
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid data URL format');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    if (!mimeType.match(/^image\/(jpg|jpeg|png|gif|webp)$/i)) {
      throw new Error('Invalid image mime type');
    }

    const extMap = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp'
    };
    const extension = extMap[mimeType.toLowerCase()] || '.jpg';
    const fullFilename = filename.endsWith(extension) ? filename : filename + extension;
    const buffer = Buffer.from(base64Data, 'base64');

    if (useBlobStorage) {
      // Upload to blob storage
      const file = {
        buffer,
        originalname: fullFilename,
        mimetype: mimeType
      };
      return await uploadToBlob(file, folder);
    } else {
      // Save to local disk
      const destinationFolder = `./uploads/${folder}`;
      fs.mkdirSync(destinationFolder, { recursive: true });
      const filePath = path.join(destinationFolder, fullFilename);
      fs.writeFileSync(filePath, buffer);
      return `/${folder}/${fullFilename}`;
    }
  } catch (error) {
    console.error('Error processing data URL:', error);
    throw error;
  }
}

// Helper function to generate URL-friendly slug from title
function generateSlug(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Middleware to handle file uploads for footer pages
const handleFooterPageUpload = (req, res, next) => {
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

/**
 * Creates a new footer page
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const createFooterPage = async (req, res) => {
  try {
    console.log('\n--- COMPLETE FOOTER PAGE REQUEST ---');
    console.log('Files received:', req.files);
    console.log('Body data keys:', Object.keys(req.body));
    
    // Parse the pageData from the form
    let pageData;
    if (req.body.pageData) {
      try {
        pageData = JSON.parse(req.body.pageData);
        console.log('Successfully parsed pageData JSON');
      } catch (e) {
        console.error('Error parsing pageData JSON:', e);
        pageData = req.body;
      }
    } else {
      // If no pageData field, use the entire body
      pageData = req.body;
    }
    
    // Parse blocks field if it's a string
    if (typeof pageData.blocks === 'string') {
      try {
        pageData.blocks = JSON.parse(pageData.blocks);
        console.log('Successfully parsed blocks JSON');
      } catch (e) {
        console.error('Error parsing blocks JSON:', e);
        // Keep as string if parsing fails
      }
    }
    
    // Validate required fields
    if (!pageData.title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Generate slug if not provided
    if (!pageData.slug) {
      pageData.slug = generateSlug(pageData.title);
    } else {
      // Ensure slug is URL-friendly
      pageData.slug = generateSlug(pageData.slug);
    }

    // Check if slug already exists
    const existingPage = await FooterPage.findOne({ slug: pageData.slug });
    if (existingPage) {
      return res.status(400).json({
        success: false,
        message: 'A page with this slug already exists'
      });
    }

    // Process block images from files
    const blockImageCount = parseInt(pageData.blockImageCount || '0', 10);
    console.log(`Processing ${blockImageCount} block images`);

    if (blockImageCount > 0) {
      // Process each block image
      for (let i = 0; i < blockImageCount; i++) {
        const imageField = `blockImages_${i}`;
        const pathField = `blockImagePath_${i}`;

        if (req.files && req.files[imageField] && req.files[imageField].length > 0) {
          const file = req.files[imageField][0];
          console.log(`Processing block image ${i}:`, file.originalname);

          // Get the file URL (blob or local)
          const fileUrl = await getImageUrl(file, 'footer-pages');

          try {
            // Replace the placeholder with the actual file URL
            const placeholder = `__FILE_REFERENCE__${i}__`;

            // Iterate through all rows, columns, and blocks to find and replace the placeholder
            if (Array.isArray(pageData.blocks)) {
              console.log('Searching for placeholder:', placeholder);

              let replacementMade = false;

              for (let rowIndex = 0; rowIndex < pageData.blocks.length; rowIndex++) {
                const row = pageData.blocks[rowIndex];
                if (!row.columns || !Array.isArray(row.columns)) continue;

                for (let colIndex = 0; colIndex < row.columns.length; colIndex++) {
                  const column = row.columns[colIndex];
                  if (!column.blocks || !Array.isArray(column.blocks)) continue;

                  for (let blockIndex = 0; blockIndex < column.blocks.length; blockIndex++) {
                    const block = column.blocks[blockIndex];

                    // Check image blocks
                    if (block.type === 'image' && block.content && block.content.url === placeholder) {
                      console.log(`Found placeholder in block ${block.id}, replacing with ${fileUrl}`);
                      block.content.url = fileUrl;
                      replacementMade = true;
                      break;
                    }
                  }

                  if (replacementMade) break;
                }

                if (replacementMade) break;
              }

              if (!replacementMade) {
                console.warn(`Could not find placeholder ${placeholder} to replace with ${fileUrl}`);
              }
            } else {
              console.error('pageData.blocks is not an array:', typeof pageData.blocks);
            }
          } catch (error) {
            console.error('Error updating block image URL:', error);
          }
        } else {
          // Check if it's a data URL that needs to be converted
          const blockImagePath = pageData[pathField];
          if (blockImagePath && typeof blockImagePath === 'string' && blockImagePath.startsWith('data:')) {
            try {
              console.log(`Processing data URL for block image ${i}`);
              const timestamp = moment().format('YYYYMMDD_HHmmss_');
              const filename = `${timestamp}${Date.now()}_block_${i}`;

              const fileUrl = await processDataUrl(blockImagePath, filename, 'footer-pages');

              // Replace placeholder in blocks structure
              const placeholder = `__FILE_REFERENCE__${i}__`;
              if (Array.isArray(pageData.blocks)) {
                let replacementMade = false;

                for (let rowIndex = 0; rowIndex < pageData.blocks.length; rowIndex++) {
                  const row = pageData.blocks[rowIndex];
                  if (!row.columns || !Array.isArray(row.columns)) continue;

                  for (let colIndex = 0; colIndex < row.columns.length; colIndex++) {
                    const column = row.columns[colIndex];
                    if (!column.blocks || !Array.isArray(column.blocks)) continue;

                    for (let blockIndex = 0; blockIndex < column.blocks.length; blockIndex++) {
                      const block = column.blocks[blockIndex];

                      if (block.type === 'image' && block.content && block.content.url === placeholder) {
                        block.content.url = fileUrl;
                        replacementMade = true;
                        break;
                      }
                    }

                    if (replacementMade) break;
                  }

                  if (replacementMade) break;
                }
              }
            } catch (error) {
              console.error(`Error processing data URL for block image ${i}:`, error);
            }
          }
        }
      }
    }

    // Handle banner image upload
    if (req.files && req.files.bannerImage && req.files.bannerImage[0]) {
      const bannerImageFile = req.files.bannerImage[0];
      console.log('Uploading banner image:', bannerImageFile.originalname, bannerImageFile.size);
      pageData.bannerImage = await getImageUrl(bannerImageFile, 'footer-pages');
    } else if (pageData.bannerImage && typeof pageData.bannerImage === 'string' && pageData.bannerImage.startsWith('data:')) {
      // Handle data URL for banner image
      try {
        console.log('Processing data URL for banner image');
        const timestamp = moment().format('YYYYMMDD_HHmmss_');
        const filename = `${timestamp}${Date.now()}_banner`;
        pageData.bannerImage = await processDataUrl(pageData.bannerImage, filename, 'footer-pages');
      } catch (error) {
        console.error('Error processing banner image data URL:', error);
      }
    }
    
    // Clean up any temporary fields used for block images processing
    if (pageData.blockImageCount) {
      const blockImageCount = parseInt(pageData.blockImageCount, 10);
      delete pageData.blockImageCount;
      
      for (let i = 0; i < blockImageCount; i++) {
        if (pageData[`blockImagePath_${i}`]) {
          delete pageData[`blockImagePath_${i}`];
        }
      }
    }

    // Set publishDate if publishStatus is 'published' and publishDate is not set
    if (pageData.publishStatus === 'published' && !pageData.publishDate) {
      pageData.publishDate = new Date();
    }

    // Ensure blocks is an array
    if (!Array.isArray(pageData.blocks)) {
      pageData.blocks = [];
    }
    
    console.log('Final page data for saving:', JSON.stringify(pageData, null, 2));
    
    // Create a new footer page instance
    const newFooterPage = new FooterPage(pageData);
    
    // Save to database
    await newFooterPage.save();
    
    res.status(201).json({
      success: true,
      message: 'Footer page created successfully',
      data: newFooterPage
    });
  } catch (error) {
    console.error('Error creating footer page:', error);
    
    // Handle duplicate slug error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A page with this slug already exists',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create footer page',
      error: error.message
    });
  }
};

/**
 * Updates an existing footer page with file uploads
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const updateFooterPage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if page exists
    const existingPage = await FooterPage.findById(id);
    if (!existingPage) {
      return res.status(404).json({
        success: false,
        message: 'Footer page not found'
      });
    }
    
    // Parse the page data from the request
    let pageData;
    if (req.body.pageData) {
      // If data was sent as FormData with files
      pageData = JSON.parse(req.body.pageData);
    } else {
      // If data was sent as JSON without files
      pageData = req.body;
    }
    console.log('Page data received for update:', pageData);
    console.log('Files received for update:', req.files);
    
    // Parse blocks field if it's a string
    if (typeof pageData.blocks === 'string') {
      try {
        pageData.blocks = JSON.parse(pageData.blocks);
        console.log('Successfully parsed blocks JSON');
      } catch (e) {
        console.error('Error parsing blocks JSON:', e);
        // Keep as string if parsing fails
      }
    }

    // Generate slug if title changed and slug not provided
    if (pageData.title && !pageData.slug) {
      pageData.slug = generateSlug(pageData.title);
    } else if (pageData.slug) {
      // Ensure slug is URL-friendly
      pageData.slug = generateSlug(pageData.slug);
    }

    // Check if slug already exists (excluding current page)
    if (pageData.slug && pageData.slug !== existingPage.slug) {
      const slugExists = await FooterPage.findOne({ slug: pageData.slug });
      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: 'A page with this slug already exists'
        });
      }
    }

    // Process any block images
    const blockImageCount = parseInt(pageData.blockImageCount || '0', 10);
    console.log(`Processing ${blockImageCount} block images for update`);

    if (blockImageCount > 0) {
      // Process each block image
      for (let i = 0; i < blockImageCount; i++) {
        const imageField = `blockImages_${i}`;
        const pathField = `blockImagePath_${i}`;

        if (req.files && req.files[imageField] && req.files[imageField].length > 0) {
          const file = req.files[imageField][0];
          console.log(`Processing block image ${i}:`, file.originalname);

          // Get the file URL (blob or local)
          const fileUrl = await getImageUrl(file, 'footer-pages');

          try {
            // Replace the placeholder with the actual file URL
            const placeholder = `__FILE_REFERENCE__${i}__`;

            // Iterate through all rows, columns, and blocks to find and replace the placeholder
            if (Array.isArray(pageData.blocks)) {
              console.log('Searching for placeholder:', placeholder);

              let replacementMade = false;

              for (let rowIndex = 0; rowIndex < pageData.blocks.length; rowIndex++) {
                const row = pageData.blocks[rowIndex];
                if (!row.columns || !Array.isArray(row.columns)) continue;

                for (let colIndex = 0; colIndex < row.columns.length; colIndex++) {
                  const column = row.columns[colIndex];
                  if (!column.blocks || !Array.isArray(column.blocks)) continue;

                  for (let blockIndex = 0; blockIndex < column.blocks.length; blockIndex++) {
                    const block = column.blocks[blockIndex];

                    // Check image blocks
                    if (block.type === 'image' && block.content && block.content.url === placeholder) {
                      console.log(`Found placeholder in block ${block.id}, replacing with ${fileUrl}`);
                      block.content.url = fileUrl;
                      replacementMade = true;
                      break;
                    }
                  }

                  if (replacementMade) break;
                }

                if (replacementMade) break;
              }

              if (!replacementMade) {
                console.warn(`Could not find placeholder ${placeholder} to replace with ${fileUrl}`);
              }
            } else {
              console.error('pageData.blocks is not an array:', typeof pageData.blocks);
            }
          } catch (error) {
            console.error('Error updating block image URL:', error);
          }
        } else {
          // Check if it's a data URL that needs to be converted
          const blockImagePath = pageData[pathField];
          if (blockImagePath && typeof blockImagePath === 'string' && blockImagePath.startsWith('data:')) {
            try {
              console.log(`Processing data URL for block image ${i}`);
              const timestamp = moment().format('YYYYMMDD_HHmmss_');
              const filename = `${timestamp}${Date.now()}_block_${i}`;

              const fileUrl = await processDataUrl(blockImagePath, filename, 'footer-pages');

              // Replace placeholder in blocks structure
              const placeholder = `__FILE_REFERENCE__${i}__`;
              if (Array.isArray(pageData.blocks)) {
                let replacementMade = false;

                for (let rowIndex = 0; rowIndex < pageData.blocks.length; rowIndex++) {
                  const row = pageData.blocks[rowIndex];
                  if (!row.columns || !Array.isArray(row.columns)) continue;

                  for (let colIndex = 0; colIndex < row.columns.length; colIndex++) {
                    const column = row.columns[colIndex];
                    if (!column.blocks || !Array.isArray(column.blocks)) continue;

                    for (let blockIndex = 0; blockIndex < column.blocks.length; blockIndex++) {
                      const block = column.blocks[blockIndex];

                      if (block.type === 'image' && block.content && block.content.url === placeholder) {
                        block.content.url = fileUrl;
                        replacementMade = true;
                        break;
                      }
                    }

                    if (replacementMade) break;
                  }

                  if (replacementMade) break;
                }
              }
            } catch (error) {
              console.error(`Error processing data URL for block image ${i}:`, error);
            }
          }
        }
      }
    }

    // Explicit banner removal (client sends bannerImage: null in JSON)
    const bannerExplicitlyCleared =
      Object.prototype.hasOwnProperty.call(pageData, 'bannerImage') &&
      pageData.bannerImage === null;

    if (bannerExplicitlyCleared) {
      if (existingPage.bannerImage) {
        try {
          await deleteFile(existingPage.bannerImage);
        } catch (err) {
          console.error('Failed to delete removed footer banner file:', err);
        }
      }
      pageData.bannerImage = null;
    } else if (req.files && req.files.bannerImage && req.files.bannerImage[0]) {
      const bannerImageFile = req.files.bannerImage[0];
      console.log('Uploading banner image:', bannerImageFile.originalname, bannerImageFile.size);
      // Delete old banner image if it exists
      if (existingPage.bannerImage) {
        await deleteFile(existingPage.bannerImage);
      }
      pageData.bannerImage = await getImageUrl(bannerImageFile, 'footer-pages');
    } else if (pageData.bannerImage && typeof pageData.bannerImage === 'string' && pageData.bannerImage.startsWith('data:')) {
      // Handle data URL for banner image
      try {
        console.log('Processing data URL for banner image');
        // Delete old banner image if it exists
        if (existingPage.bannerImage) {
          await deleteFile(existingPage.bannerImage);
        }
        const timestamp = moment().format('YYYYMMDD_HHmmss_');
        const filename = `${timestamp}${Date.now()}_banner`;
        pageData.bannerImage = await processDataUrl(pageData.bannerImage, filename, 'footer-pages');
      } catch (error) {
        console.error('Error processing banner image data URL:', error);
      }
    } else if (!pageData.bannerImage && existingPage.bannerImage) {
      // Key omitted or empty string: keep existing stored path (legacy clients)
      pageData.bannerImage = existingPage.bannerImage;
    }
    
    // Clean up any temporary fields used for block images processing
    if (pageData.blockImageCount) {
      const blockImageCount = parseInt(pageData.blockImageCount, 10);
      delete pageData.blockImageCount;
      
      for (let i = 0; i < blockImageCount; i++) {
        if (pageData[`blockImagePath_${i}`]) {
          delete pageData[`blockImagePath_${i}`];
        }
      }
    }

    // Set publishDate if publishStatus is 'published' and publishDate is not set
    if (pageData.publishStatus === 'published' && !pageData.publishDate) {
      pageData.publishDate = new Date();
    }

    // Ensure blocks is an array
    if (!Array.isArray(pageData.blocks)) {
      pageData.blocks = pageData.blocks || [];
    }
    
    const updatedFooterPage = await FooterPage.findByIdAndUpdate(
      id,
      pageData,
      { new: true, runValidators: true }
    );
    
    if (!updatedFooterPage) {
      return res.status(404).json({
        success: false,
        message: 'Footer page not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Footer page updated successfully',
      data: updatedFooterPage
    });
  } catch (error) {
    console.error('Error updating footer page:', error);
    
    // Handle duplicate slug error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A page with this slug already exists',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update footer page',
      error: error.message
    });
  }
};

/**
 * Gets a footer page by ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getFooterPageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const footerPage = await FooterPage.findById(id);
    
    if (!footerPage) {
      return res.status(404).json({
        success: false,
        message: 'Footer page not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: footerPage
    });
  } catch (error) {
    console.error('Error getting footer page:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get footer page',
      error: error.message
    });
  }
};

/**
 * Gets a footer page by slug
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getFooterPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Decode the slug in case it's URL encoded
    const decodedSlug = decodeURIComponent(slug);
    
    console.log('Fetching footer page by slug:', decodedSlug);
    
    // Try to find the page with the slug (case-insensitive search)
    // First try exact match (lowercase)
    let footerPage = await FooterPage.findOne({ slug: decodedSlug.toLowerCase() });
    
    // If not found, try case-insensitive regex search
    if (!footerPage) {
      footerPage = await FooterPage.findOne({ 
        slug: { $regex: new RegExp(`^${decodedSlug}$`, 'i') } 
      });
    }
    
    if (!footerPage) {
      console.log('Footer page not found for slug:', decodedSlug);
      // Log available slugs for debugging
      const allPages = await FooterPage.find({}, { slug: 1, title: 1 });
      console.log('Available footer page slugs:', allPages.map(p => ({ slug: p.slug, title: p.title })));
      
      return res.status(404).json({
        success: false,
        message: 'Footer page not found',
        requestedSlug: decodedSlug
      });
    }
    
    console.log('Footer page found:', footerPage.title);
    console.log('Banner Image Alt:', footerPage.bannerImageAlt);
    console.log('Banner Image Description:', footerPage.bannerImageDescription);
    
    res.status(200).json({
      success: true,
      data: footerPage
    });
  } catch (error) {
    console.error('Error getting footer page by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get footer page by slug',
      error: error.message
    });
  }
};

/**
 * Gets all footer pages with optional filtering and pagination
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getAllFooterPages = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { 
      publishStatus, 
      page = 1, 
      limit = 10,
      search 
    } = req.query;
    
    // Build query object based on filters
    const query = {};
    if (publishStatus) {
      query.publishStatus = publishStatus;
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { metaTitle: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination info
    const total = await FooterPage.countDocuments(query);
    
    // Get footer pages with pagination
    const footerPages = await FooterPage
      .find(query)
      .select({
        title: 1,
        slug: 1,
        bannerImage: 1,
        publishStatus: 1,
        publishDate: 1,
        metaTitle: 1,
        metaDescription: 1,
        createdAt: 1,
        updatedAt: 1
      })
      .sort({ updatedAt: -1 }) // Latest first by update date
      .skip(skip)
      .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: footerPages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting footer pages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get footer pages',
      error: error.message
    });
  }
};

/**
 * Deletes a footer page
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const deleteFooterPage = async (req, res) => {
  try {
    const { id } = req.params;

    const footerPage = await FooterPage.findById(id);
    if (!footerPage) {
      return res.status(404).json({
        success: false,
        message: 'Footer page not found'
      });
    }

    // Delete associated images from storage
    // Delete banner image
    if (footerPage.bannerImage) {
      await deleteFile(footerPage.bannerImage);
    }

    // Delete block images
    if (Array.isArray(footerPage.blocks)) {
      for (const row of footerPage.blocks) {
        if (!row.columns || !Array.isArray(row.columns)) continue;
        for (const column of row.columns) {
          if (!column.blocks || !Array.isArray(column.blocks)) continue;
          for (const block of column.blocks) {
            if (block.type === 'image' && block.content && block.content.url) {
              await deleteFile(block.content.url);
            }
          }
        }
      }
    }

    const result = await FooterPage.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Footer page not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Footer page deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting footer page:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete footer page',
      error: error.message
    });
  }
};

module.exports = {
  createFooterPage,
  updateFooterPage,
  getFooterPageById,
  getFooterPageBySlug,
  getAllFooterPages,
  deleteFooterPage,
  handleFooterPageUpload
};
