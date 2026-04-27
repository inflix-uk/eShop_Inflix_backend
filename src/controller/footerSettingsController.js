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
      socialMedia: []
    },
    section2: {
      title: '',
      links: []
    },
    section3: {
      title: '',
      links: []
    },
    sectionNewsletter: {
      isEnabled: false,
      heading: '',
      description: '',
      placeholder: '',
      buttonLabel: '',
      imageUrl: ''
    },
    bottomBar: {
      textBeforeCredit: '',
      creditLabel: '',
      creditUrl: ''
    },
    section4: {
      title: '',
      links: []
    },
    section5: {
      title: '',
      text: '',
      ecologiLogo: null,
      ecologiLink: '',
      paymentMethods: {
        heading: '',
        logos: []
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

    const defaults = getDefaultFooterSettings();
    const existing = await FooterSettings.findOne().lean();
    const prev = existing || {};

    const merged = {
      section1: {
        ...defaults.section1,
        ...(prev.section1 || {}),
        ...(section1 || {}),
      },
      section2: {
        ...defaults.section2,
        ...(prev.section2 || {}),
        ...(section2 || {}),
      },
      section3: {
        ...defaults.section3,
        ...(prev.section3 || {}),
        ...(section3 || {}),
      },
      section4: {
        ...defaults.section4,
        ...(prev.section4 || {}),
        ...(section4 || {}),
      },
      section5: {
        ...defaults.section5,
        ...(prev.section5 || {}),
        ...(section5 || {}),
        paymentMethods: {
          ...defaults.section5.paymentMethods,
          ...((prev.section5 && prev.section5.paymentMethods) || {}),
          ...((section5 && section5.paymentMethods) || {}),
          logos:
            (section5 &&
              section5.paymentMethods &&
              section5.paymentMethods.logos) ||
            (prev.section5 &&
              prev.section5.paymentMethods &&
              prev.section5.paymentMethods.logos) ||
            defaults.section5.paymentMethods.logos,
        },
      },
      sectionNewsletter: {
        ...defaults.sectionNewsletter,
        ...(prev.sectionNewsletter || {}),
        ...(sectionNewsletter || {}),
      },
      bottomBar: {
        ...defaults.bottomBar,
        ...(prev.bottomBar || {}),
        ...(bottomBar || {}),
      },
    };

    if (merged.section1.logo != null && typeof merged.section1.logo === 'object') {
      merged.section1.logo = {
        ...defaults.section1.logo,
        ...((prev.section1 && prev.section1.logo) || {}),
        ...merged.section1.logo,
      };
    }

    const settings = await FooterSettings.findOneAndUpdate(
      {},
      { $set: merged },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
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
    
    const defaults = getDefaultFooterSettings();
    const existing = await FooterSettings.findOne().lean();
    const prev = existing || {};

    let mergedSection;
    if (section === 'section5') {
      mergedSection = {
        ...defaults.section5,
        ...(prev.section5 || {}),
        ...sectionData,
        paymentMethods: {
          ...defaults.section5.paymentMethods,
          ...((prev.section5 && prev.section5.paymentMethods) || {}),
          ...((sectionData && sectionData.paymentMethods) || {}),
          logos:
            (sectionData.paymentMethods && sectionData.paymentMethods.logos) ||
            (prev.section5 &&
              prev.section5.paymentMethods &&
              prev.section5.paymentMethods.logos) ||
            defaults.section5.paymentMethods.logos,
        },
      };
    } else {
      mergedSection = {
        ...defaults[section],
        ...(prev[section] || {}),
        ...sectionData,
      };
    }

    if (section === 'section1' && mergedSection.logo != null && typeof mergedSection.logo === 'object') {
      mergedSection.logo = {
        ...defaults.section1.logo,
        ...((prev.section1 && prev.section1.logo) || {}),
        ...mergedSection.logo,
      };
    }

    const updateQuery = { [`${section}`]: mergedSection };

    const settings = await FooterSettings.findOneAndUpdate(
      {},
      { $set: updateQuery },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
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
