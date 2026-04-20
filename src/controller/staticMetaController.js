const StaticMeta = require('../models/staticMeta');

// Get all static meta pages
const getAllStaticMetaPages = async (req, res) => {
  try {
    const staticMetaPages = await StaticMeta.find().sort({ updatedAt: -1 });
    res.status(200).json({
      success: true,
      data: staticMetaPages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch static meta pages',
      error: error.message
    });
  }
};

// Get static meta page by ID
const getStaticMetaPageById = async (req, res) => {
  try {
    const staticMetaPage = await StaticMeta.findById(req.params.id);
    
    if (!staticMetaPage) {
      return res.status(404).json({
        success: false,
        message: 'Static meta page not found'
      });
    }

    res.status(200).json({
      success: true,
      data: staticMetaPage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch static meta page',
      error: error.message
    });
  }
};

// Get static meta page by path
const getStaticMetaPageByPath = async (req, res) => {
  try {
    const path = req.params.path;
    const staticMetaPage = await StaticMeta.findOne({ path: path, isPublished: true });
    
    if (!staticMetaPage) {
      return res.status(404).json({
        success: false,
        message: 'Static meta page not found'
      });
    }

    res.status(200).json({
      success: true,
      data: staticMetaPage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch static meta page',
      error: error.message
    });
  }
};

// Create a new static meta page
const createStaticMetaPage = async (req, res) => {
  try {
    const { pageName, path, titleTag, metaDescription, metaKeywords, canonicalUrl, metaSchemas, isPublished } = req.body;

    // Check if path already exists
    const existingPage = await StaticMeta.findOne({ path });
    if (existingPage) {
      return res.status(400).json({
        success: false,
        message: 'A page with this path already exists'
      });
    }

    const newStaticMetaPage = new StaticMeta({
      pageName,
      path,
      titleTag,
      metaDescription,
      metaKeywords,
      canonicalUrl,
      metaSchemas: metaSchemas || [],
      isPublished: isPublished !== undefined ? isPublished : true
    });

    const savedStaticMetaPage = await newStaticMetaPage.save();

    res.status(201).json({
      success: true,
      message: 'Static meta page created successfully',
      data: savedStaticMetaPage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create static meta page',
      error: error.message
    });
  }
};

// Update a static meta page
const updateStaticMetaPage = async (req, res) => {
  try {
    const { pageName, path, titleTag, metaDescription, metaKeywords, canonicalUrl, metaSchemas, isPublished } = req.body;
    
    // Check if path already exists for another page
    if (path) {
      const existingPage = await StaticMeta.findOne({ 
        path, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingPage) {
        return res.status(400).json({
          success: false,
          message: 'Another page with this path already exists'
        });
      }
    }

    const updatedStaticMetaPage = await StaticMeta.findByIdAndUpdate(
      req.params.id,
      {
        pageName,
        path,
        titleTag,
        metaDescription,
        metaKeywords,
        canonicalUrl,
        metaSchemas,
        isPublished,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!updatedStaticMetaPage) {
      return res.status(404).json({
        success: false,
        message: 'Static meta page not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Static meta page updated successfully',
      data: updatedStaticMetaPage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update static meta page',
      error: error.message
    });
  }
};

// Toggle publish status of a static meta page
const togglePublishStatus = async (req, res) => {
  try {
    const staticMetaPage = await StaticMeta.findById(req.params.id);
    
    if (!staticMetaPage) {
      return res.status(404).json({
        success: false,
        message: 'Static meta page not found'
      });
    }

    staticMetaPage.isPublished = !staticMetaPage.isPublished;
    staticMetaPage.updatedAt = Date.now();
    
    await staticMetaPage.save();

    res.status(200).json({
      success: true,
      message: `Static meta page ${staticMetaPage.isPublished ? 'published' : 'unpublished'} successfully`,
      data: staticMetaPage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle publish status',
      error: error.message
    });
  }
};

// Delete a static meta page
const deleteStaticMetaPage = async (req, res) => {
  try {
    const deletedStaticMetaPage = await StaticMeta.findByIdAndDelete(req.params.id);
    
    if (!deletedStaticMetaPage) {
      return res.status(404).json({
        success: false,
        message: 'Static meta page not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Static meta page deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete static meta page',
      error: error.message
    });
  }
};

module.exports = {
  getAllStaticMetaPages,
  getStaticMetaPageById,
  getStaticMetaPageByPath,
  createStaticMetaPage,
  updateStaticMetaPage,
  togglePublishStatus,
  deleteStaticMetaPage
};
