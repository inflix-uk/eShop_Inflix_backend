const PageCategory = require('../models/pageCategory');
const { toSeoSlug } = require('../utils/slugUtils');

/**
 * List all page categories (sorted for navigation).
 */
const getAllPageCategories = async (req, res) => {
  try {
    const categories = await PageCategory.find()
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Error listing page categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list page categories',
      error: error.message,
    });
  }
};

/**
 * Create a page category (admin).
 */
const createPageCategory = async (req, res) => {
  try {
    const { name, slug: slugInput, sortOrder } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    const slug = slugInput && String(slugInput).trim()
      ? toSeoSlug(slugInput)
      : toSeoSlug(name);

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Could not derive a valid slug from name',
      });
    }

    const existing = await PageCategory.findOne({ slug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A category with this slug already exists',
      });
    }

    const order =
      sortOrder === undefined || sortOrder === null || sortOrder === ''
        ? 0
        : Number(sortOrder);
    const sortOrderNum = Number.isFinite(order) ? order : 0;

    const doc = new PageCategory({
      name: name.trim(),
      slug,
      sortOrder: sortOrderNum,
    });
    await doc.save();

    res.status(201).json({
      success: true,
      message: 'Category created',
      data: doc,
    });
  } catch (error) {
    console.error('Error creating page category:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A category with this slug already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create page category',
      error: error.message,
    });
  }
};

/**
 * Update a page category (admin).
 */
const updatePageCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug: slugInput, sortOrder } = req.body;

    const doc = await PageCategory.findById(id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty',
        });
      }
      doc.name = name.trim();
    }

    if (slugInput !== undefined && slugInput !== null && String(slugInput).trim()) {
      const newSlug = toSeoSlug(slugInput);
      if (!newSlug) {
        return res.status(400).json({
          success: false,
          message: 'Invalid slug',
        });
      }
      const clash = await PageCategory.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });
      if (clash) {
        return res.status(400).json({
          success: false,
          message: 'A category with this slug already exists',
        });
      }
      doc.slug = newSlug;
    }

    if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
      const order = Number(sortOrder);
      doc.sortOrder = Number.isFinite(order) ? order : doc.sortOrder;
    }

    await doc.save();

    res.status(200).json({
      success: true,
      message: 'Category updated',
      data: doc,
    });
  } catch (error) {
    console.error('Error updating page category:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A category with this slug already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update page category',
      error: error.message,
    });
  }
};

/**
 * Delete a page category (admin).
 */
const deletePageCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PageCategory.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Category deleted',
    });
  } catch (error) {
    console.error('Error deleting page category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete page category',
      error: error.message,
    });
  }
};

module.exports = {
  getAllPageCategories,
  createPageCategory,
  updatePageCategory,
  deletePageCategory,
};
