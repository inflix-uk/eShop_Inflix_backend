const { Blog } = require('../../models/newblog/newBlog'); 
const { Category } = require('../../models/newblog/newBlogCategory');
/**
 * Gets all categories
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: error.message
    });
  }
};

/**
 * Get a category by ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category',
      error: error.message
    });
  }
};

/**
 * Creates a new category
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists'
      });
    }
    
    const newCategory = new Category({
      name,
      description,
      slug: name.toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
    });
    
    await newCategory.save();
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: newCategory
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

/**
 * Updates an existing category
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, slug } = req.body;
    
    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if name is being changed and if it already exists
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }
    
    // Update fields
    category.name = name || category.name;
    category.description = description !== undefined ? description : category.description;
    
    // Only update slug if provided explicitly
    if (slug) {
      category.slug = slug;
    } else if (name && name !== category.name) {
      // Generate slug from new name
      category.slug = name.toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    
    await category.save();
    
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

/**
 * Deletes a category
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if category is being used in any blog posts
    const blogsUsingCategory = await Blog.countDocuments({ categories: category._id });
    
    if (blogsUsingCategory > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It is being used in ${blogsUsingCategory} blog post(s).`
      });
    }
    
    await Category.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

/**
 * Get category stats (count of posts per category)
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getCategoryStats = async (req, res) => {
  try {
   
    const categories = await Category.find().sort({ name: 1 });
    
    // For each category, count the number of blog posts
    const categoryStats = await Promise.all(categories.map(async (category) => {
      const postCount = await Blog.countDocuments({ categories: category._id });
      return {
        ...category.toObject(),
        postCount
      };
    }));
    
    res.status(200).json({
      success: true,
      data: categoryStats
    });
  } catch (error) {
    console.error('Error getting category stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category stats',
      error: error.message
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats
};
