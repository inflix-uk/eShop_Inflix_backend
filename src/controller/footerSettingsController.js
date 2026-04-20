const FooterSettings = require('../models/footerSettings');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const blobStorage = require('../utils/blobStorage');

// Check if we should use Blob storage (Vercel) or local disk storage (development)
const useBlobStorage = blobStorage.isConfigured();

// Get admin identifier for logging
const getAdminIdentifier = (req) => {
  return req.headers['x-user-id'] || 
         req.headers['x-admin-id'] || 
         req.headers['authorization']?.substring(0, 20) || 
         req.ip || 
         'unknown';
};

// Default footer settings structure
const getDefaultFooterSettings = () => {
  return {
    section1: {
      logo: {
        image: null,
        link: '/'
      },
      description: '',
      socialMedia: [
        { name: 'Twitter', icon: null, link: 'https://twitter.com/zextons_uk', isActive: true, order: 0 },
        { name: 'YouTube', icon: null, link: 'https://youtube.com/@zextons', isActive: true, order: 1 },
        { name: 'Instagram', icon: null, link: 'https://instagram.com/zextons_uk', isActive: true, order: 2 },
        { name: 'TikTok', icon: null, link: 'https://tiktok.com/@zextons_uk', isActive: true, order: 3 },
        { name: 'Facebook', icon: null, link: 'https://facebook.com/zextons', isActive: true, order: 4 },
        { name: 'Pinterest', icon: null, link: 'https://pinterest.com/zextons', isActive: true, order: 5 }
      ]
    },
    section2: {
      title: 'Useful Links',
      links: [
        { text: 'Read Our Blogs', link: '/blogs', isActive: true, order: 0 },
        { text: 'Sell Your Mobile', link: '/sell-mobile', isActive: true, order: 1 },
        { text: 'Trade In', link: '/trade-in', isActive: true, order: 2 },
        { text: 'Refurbished Phones', link: '/refurbished-phones', isActive: true, order: 3 },
        { text: 'Mobile Accessories', link: '/accessories', isActive: true, order: 4 },
        { text: 'Tablets & iPads', link: '/tablets', isActive: true, order: 5 },
        { text: 'Laptops & MacBooks', link: '/laptops', isActive: true, order: 6 },
        { text: 'Gaming Consoles', link: '/gaming', isActive: true, order: 7 },
        { text: 'Smart Watches', link: '/smartwatches', isActive: true, order: 8 },
        { text: 'Deals & Discounts', link: '/deals-and-discounts', isActive: true, order: 9 }
      ]
    },
    section3: {
      title: 'Customer Care',
      links: [
        { text: 'Terms & Conditions', link: '/terms-and-conditions', isActive: true, order: 0 },
        { text: 'Trade-in Terms & Conditions', link: '/trade-in-terms-and-conditions', isActive: true, order: 1 },
        { text: 'Privacy Policy', link: '/privacy-policy', isActive: true, order: 2 },
        { text: 'Deals & Discounts', link: '/deals-and-discounts', isActive: true, order: 3 },
        { text: 'Returns & Refund Policy', link: '/refund-and-return-policy', isActive: true, order: 4 },
        { text: 'Shipping Policy', link: '/shipping-policy', isActive: true, order: 5 },
        { text: 'FAQs', link: '/faqs', isActive: true, order: 6 },
        { text: 'Contact Us', link: '/contact-us', isActive: true, order: 7 },
        { text: 'About Us', link: '/about-zextons', isActive: true, order: 8 },
        { text: 'Subscribe Our Newsletter', link: '/subscribe-newsletter', isActive: true, order: 9 }
      ]
    },
    sectionNewsletter: {
      isEnabled: true,
      heading: 'Stay in the loop',
      description: 'Get deals and product news straight to your inbox.',
      placeholder: 'Enter your email',
      buttonLabel: 'Subscribe',
      imageUrl: ''
    },
    bottomBar: {
      textBeforeCredit:
        'ZEXTONS TECH STORE © {{year}} All Rights Reserved. Company Number: 10256988. Designed and Developed by ',
      creditLabel: 'Inflix',
      creditUrl: 'https://inflix.co.uk'
    },
    section4: {
      title: 'Hot Selling Gadgets',
      links: [
        { text: 'iPhone 15 Pro Max', link: '/products/iphone-15-pro-max', isActive: true, order: 0 },
        { text: 'Samsung Galaxy S24 Ultra', link: '/products/samsung-galaxy-s24-ultra', isActive: true, order: 1 },
        { text: 'iPad Pro 12.9"', link: '/products/ipad-pro-12-9', isActive: true, order: 2 },
        { text: 'MacBook Pro M3', link: '/products/macbook-pro-m3', isActive: true, order: 3 },
        { text: 'AirPods Pro 2', link: '/products/airpods-pro-2', isActive: true, order: 4 },
        { text: 'Sony PlayStation 5', link: '/products/ps5', isActive: true, order: 5 },
        { text: 'Xbox Series X', link: '/products/xbox-series-x', isActive: true, order: 6 },
        { text: 'Apple Watch Series 9', link: '/products/apple-watch-series-9', isActive: true, order: 7 },
        { text: 'Samsung Galaxy Watch 6', link: '/products/samsung-galaxy-watch-6', isActive: true, order: 8 },
        { text: 'Nintendo Switch OLED', link: '/products/nintendo-switch-oled', isActive: true, order: 9 },
        { text: 'Google Pixel 8 Pro', link: '/products/google-pixel-8-pro', isActive: true, order: 10 },
        { text: 'OnePlus 12', link: '/products/oneplus-12', isActive: true, order: 11 }
      ]
    },
    section5: {
      title: 'Our Climate Impact',
      text: 'We plant a tree with every order',
      ecologiLogo: null,
      ecologiLink: 'https://ecologi.com/zextons',
      paymentMethods: {
        heading: 'We accept the following payment methods:',
        logos: [
          { name: 'Visa', image: null, isActive: true, order: 0 },
          { name: 'Mastercard', image: null, isActive: true, order: 1 },
          { name: 'American Express', image: null, isActive: true, order: 2 },
          { name: 'PayPal', image: null, isActive: true, order: 3 },
          { name: 'Apple Pay', image: null, isActive: true, order: 4 },
          { name: 'Google Pay', image: null, isActive: true, order: 5 },
          { name: 'Stripe', image: null, isActive: true, order: 6 },
          { name: 'Klarna', image: null, isActive: true, order: 7 }
        ]
      }
    }
  };
};

// Memory storage for Vercel Blob uploads
const memoryStorage = multer.memoryStorage();

// Configure multer disk storage - dynamic based on type from request body
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Get type from req.body (available after multer processes form data)
    const type = req.body.type || 'logo';
    let subdirectory = 'footer';

    if (type === 'social-icon') {
      subdirectory = 'footer/social';
    } else if (type === 'payment-logo') {
      subdirectory = 'footer/payments';
    }

    const destinationFolder = `./uploads/${subdirectory}`;
    // Create directory if it doesn't exist
    fs.mkdirSync(destinationFolder, { recursive: true });
    cb(null, destinationFolder);
  },
  filename: function (req, file, cb) {
    // Sanitize filename: remove special characters, replace spaces with hyphens
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/\s+/g, '-')
      .toLowerCase();

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const extension = path.extname(sanitizedName);
    const baseName = path.basename(sanitizedName, extension);
    const uniqueFilename = `${baseName}_${timestamp}${extension}`;

    cb(null, uniqueFilename);
  }
});

// Helper function to upload file to Blob storage
async function uploadToBlob(file, folder = 'footer') {
  if (!file) return null;
  try {
    const result = await blobStorage.uploadFile(file, folder);
    return result ? result.url : null;
  } catch (error) {
    console.error('Error uploading to blob:', error);
    return null;
  }
}

// File filter for image validation
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp, svg)'));
  }
};

/**
 * GET /footer/settings
 * Get all footer settings or return defaults
 */
const getFooterSettings = async (req, res) => {
  try {
    let settings = await FooterSettings.findOne();
    
    // If no settings exist, return default structure
    if (!settings) {
      const defaultSettings = getDefaultFooterSettings();
      return res.status(200).json({
        success: true,
        data: defaultSettings,
        message: 'Default footer settings returned'
      });
    }
    
    // Convert to plain object and return
    const settingsData = settings.toObject();
    delete settingsData._id;
    delete settingsData.__v;
    delete settingsData.createdAt;
    delete settingsData.updatedAt;

    const defaultFooter = getDefaultFooterSettings();
    settingsData.bottomBar = {
      ...defaultFooter.bottomBar,
      ...(settingsData.bottomBar || {}),
    };
    
    res.status(200).json({
      success: true,
      data: settingsData
    });
  } catch (error) {
    console.error('❌ Error fetching footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch footer settings',
      error: error.message
    });
  }
};

/**
 * POST /footer/settings
 * Create or update footer settings (upsert)
 */
const saveFooterSettings = async (req, res) => {
  try {
    const { section1, section2, section3, section4, section5, sectionNewsletter, bottomBar } = req.body;
    
    // Validate that at least one section is provided
    if (!section1 && !section2 && !section3 && !section4 && !section5 && !sectionNewsletter && !bottomBar) {
      return res.status(400).json({
        success: false,
        message: 'At least one section must be provided'
      });
    }
    
    // Prepare update data
    const updateData = {};
    if (section1) updateData.section1 = section1;
    if (section2) updateData.section2 = section2;
    if (section3) updateData.section3 = section3;
    if (section4) updateData.section4 = section4;
    if (section5) updateData.section5 = section5;
    if (sectionNewsletter) updateData.sectionNewsletter = sectionNewsletter;
    if (bottomBar) updateData.bottomBar = bottomBar;
    
    // Use findOneAndUpdate with upsert to create or update
    const settings = await FooterSettings.findOneAndUpdate(
      {}, // Empty filter means find any document
      updateData,
      { 
        new: true, 
        upsert: true, 
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );
    
    // Log admin action
    const adminId = getAdminIdentifier(req);
    console.log(`📋 [ADMIN ACTION] Admin ${adminId} saved footer settings at ${new Date().toISOString()}`);
    
    // Convert to plain object
    const settingsData = settings.toObject();
    delete settingsData._id;
    delete settingsData.__v;
    delete settingsData.createdAt;
    delete settingsData.updatedAt;
    
    res.status(200).json({
      success: true,
      message: 'Footer settings saved successfully',
      data: settingsData
    });
  } catch (error) {
    console.error('❌ Error saving footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save footer settings',
      error: error.message
    });
  }
};

/**
 * PATCH /footer/settings/:section
 * Update a specific section
 */
const updateFooterSection = async (req, res) => {
  try {
    const { section } = req.params;
    const sectionData = req.body;
    
    // Validate section name
    const validSections = ['section1', 'section2', 'section3', 'section4', 'section5', 'sectionNewsletter', 'bottomBar'];
    if (!validSections.includes(section)) {
      return res.status(400).json({
        success: false,
        message: `Invalid section name. Must be one of: ${validSections.join(', ')}`
      });
    }
    
    // Validate that section data is provided
    if (!sectionData || Object.keys(sectionData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Section data is required'
      });
    }
    
    // Update the specific section
    const updateQuery = { [`${section}`]: sectionData };
    
    const settings = await FooterSettings.findOneAndUpdate(
      {},
      updateQuery,
      { 
        new: true, 
        upsert: true, 
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );
    
    // Log admin action
    const adminId = getAdminIdentifier(req);
    console.log(`📋 [ADMIN ACTION] Admin ${adminId} updated footer ${section} at ${new Date().toISOString()}`);
    
    // Return only the updated section
    const settingsData = settings.toObject();
    const updatedSection = settingsData[section];
    
    res.status(200).json({
      success: true,
      message: `Footer ${section} updated successfully`,
      data: updatedSection
    });
  } catch (error) {
    console.error(`❌ Error updating footer ${req.params.section}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to update footer ${req.params.section}`,
      error: error.message
    });
  }
};

/**
 * POST /footer/upload-image
 * Upload an image for footer (logo, social icon, or payment logo)
 */
const uploadFooterImage = async (req, res) => {
  try {
    const { type, directory } = req.body;

    // Validate type
    const validTypes = ['logo', 'social-icon', 'payment-logo'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate directory (should always be 'footer')
    if (directory !== 'footer') {
      return res.status(400).json({
        success: false,
        message: "Directory must be 'footer'"
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    let imagePath;

    if (useBlobStorage) {
      // Upload to Vercel Blob storage
      let folder = 'footer';
      if (type === 'social-icon') {
        folder = 'footer/social';
      } else if (type === 'payment-logo') {
        folder = 'footer/payments';
      }
      imagePath = await uploadToBlob(req.file, folder);

      if (!imagePath) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image to storage'
        });
      }
    } else {
      // Get relative path from uploads directory (local storage)
      const relativePath = path.relative('./uploads', req.file.path).replace(/\\/g, '/');
      imagePath = `/${relativePath}`;
    }

    // Log admin action
    const adminId = getAdminIdentifier(req);
    console.log(`📋 [ADMIN ACTION] Admin ${adminId} uploaded footer image (${type}): ${imagePath} at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imagePath: imagePath,
      data: {
        path: imagePath,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('❌ Error uploading footer image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
};

// Multer upload configuration
const upload = multer({
  storage: useBlobStorage ? memoryStorage : diskStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: imageFileFilter
}).single('image');

// Middleware to handle file uploads for footer images
const handleFooterImageUpload = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 2MB'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error',
        error: err.message
      });
    } else if (err) {
      // An unknown error occurred when uploading
      return res.status(400).json({
        success: false,
        message: 'Unknown upload error',
        error: err.message
      });
    }
    // Everything went fine
    next();
  });
};

module.exports = {
  getFooterSettings,
  saveFooterSettings,
  updateFooterSection,
  uploadFooterImage,
  handleFooterImageUpload
};
