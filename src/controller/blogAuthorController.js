const BlogAuthor = require('../models/blogAuthor');

function toClientAuthor(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(obj._id),
    _id: String(obj._id),
    name: obj.name || '',
    email: obj.email || '',
    designation: obj.designation || '',
    role: obj.role === 'reviewer' ? 'reviewer' : 'author',
    image: obj.image || '',
    bio: obj.bio || '',
    blocks: Array.isArray(obj.blocks) ? obj.blocks : [],
    isActive: obj.isActive !== false,
    createdAt: obj.createdAt || null,
    updatedAt: obj.updatedAt || null,
  };
}

function sanitizePayload(body = {}) {
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const name = String(body.name || '').trim();
  const role = body.role === 'reviewer' ? 'reviewer' : 'author';
  const image = String(body.image || '');
  // Guard against accidental huge base64 blobs blowing Mongo docs
  const safeImage =
    image.startsWith('data:') && image.length > 1_500_000 ? '' : image;

  return {
    name,
    email,
    designation: String(body.designation || '').trim(),
    role,
    image: safeImage,
    bio: String(body.bio || ''),
    blocks: Array.isArray(body.blocks) ? body.blocks : [],
  };
}

/**
 * GET /blog-authors
 */
const listBlogAuthors = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '') === 'true';
    const filter = includeInactive ? {} : { isActive: true };
    const docs = await BlogAuthor.find(filter).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      data: docs.map(toClientAuthor),
    });
  } catch (error) {
    console.error('[listBlogAuthors]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load authors',
      error: error.message,
    });
  }
};

/**
 * POST /blog-authors
 * Create, or revive soft-deleted author with same email+role.
 */
const createBlogAuthor = async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);
    if (!payload.name || !payload.email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
      });
    }

    const existing = await BlogAuthor.findOne({
      email: payload.email,
      role: payload.role,
    });

    if (existing) {
      if (existing.isActive) {
        return res.status(409).json({
          success: false,
          message: `A ${payload.role} with this email already exists`,
          data: toClientAuthor(existing),
        });
      }
      // Revive soft-deleted record so re-add after delete works
      existing.name = payload.name;
      existing.designation = payload.designation;
      existing.image = payload.image;
      existing.bio = payload.bio;
      existing.blocks = payload.blocks;
      existing.isActive = true;
      await existing.save();
      return res.status(200).json({
        success: true,
        message: 'Author restored successfully',
        data: toClientAuthor(existing),
      });
    }

    const created = await BlogAuthor.create({
      ...payload,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Author created successfully',
      data: toClientAuthor(created),
    });
  } catch (error) {
    console.error('[createBlogAuthor]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create author',
      error: error.message,
    });
  }
};

/**
 * PUT /blog-authors/:id
 */
const updateBlogAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = sanitizePayload(req.body);
    if (!payload.name || !payload.email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
      });
    }

    const existing = await BlogAuthor.findById(id);
    if (!existing || existing.isActive === false) {
      return res.status(404).json({
        success: false,
        message: 'Author not found',
      });
    }

    const clash = await BlogAuthor.findOne({
      _id: { $ne: existing._id },
      email: payload.email,
      role: payload.role,
      isActive: true,
    });
    if (clash) {
      return res.status(409).json({
        success: false,
        message: `Another active ${payload.role} already uses this email`,
      });
    }

    existing.name = payload.name;
    existing.email = payload.email;
    existing.designation = payload.designation;
    existing.role = payload.role;
    existing.image = payload.image;
    existing.bio = payload.bio;
    existing.blocks = payload.blocks;
    await existing.save();

    return res.status(200).json({
      success: true,
      message: 'Author updated successfully',
      data: toClientAuthor(existing),
    });
  } catch (error) {
    console.error('[updateBlogAuthor]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update author',
      error: error.message,
    });
  }
};

/**
 * DELETE /blog-authors/:id  (soft delete)
 */
const deleteBlogAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await BlogAuthor.findById(id);
    if (!existing || existing.isActive === false) {
      return res.status(404).json({
        success: false,
        message: 'Author not found',
      });
    }

    existing.isActive = false;
    await existing.save();

    return res.status(200).json({
      success: true,
      message: 'Author deleted successfully',
      data: toClientAuthor(existing),
    });
  } catch (error) {
    console.error('[deleteBlogAuthor]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete author',
      error: error.message,
    });
  }
};

module.exports = {
  listBlogAuthors,
  createBlogAuthor,
  updateBlogAuthor,
  deleteBlogAuthor,
  toClientAuthor,
};
