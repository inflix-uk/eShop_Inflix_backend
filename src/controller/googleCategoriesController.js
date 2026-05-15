// controller/googleCategoriesController.js

const GoogleCategory = require('../models/googleCategory');

module.exports = {
  // GET /get/google/categories
  getAllGoogleCategories: async (req, res) => {
    try {
      const {
        search = '',
        level,
        parentGoogleId,
        isActive,
        isFeatured,
        isLeaf,
        page = 1,
        limit = 100,
        sortBy = 'fullPath',
        sortDir = 'asc'
      } = req.query;

      const query = {};
      if (search) {
        const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [{ name: re }, { fullPath: re }];
      }
      if (level !== undefined && level !== '') query.level = Number(level);
      if (parentGoogleId !== undefined && parentGoogleId !== '') {
        query.parentGoogleId = parentGoogleId === 'null' ? null : Number(parentGoogleId);
      }
      if (isActive !== undefined && isActive !== '') query.isActive = isActive === 'true';
      if (isFeatured !== undefined && isFeatured !== '') query.isFeatured = isFeatured === 'true';
      if (isLeaf !== undefined && isLeaf !== '') query.isLeaf = isLeaf === 'true';

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
      const skip = (pageNum - 1) * limitNum;

      const sort = { [sortBy]: sortDir === 'desc' ? -1 : 1 };

      const [total, items] = await Promise.all([
        GoogleCategory.countDocuments(query),
        GoogleCategory.find(query).sort(sort).skip(skip).limit(limitNum).lean()
      ]);

      return res.json({
        message: 'Google categories fetched successfully',
        status: 201,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        googleCategories: items
      });
    } catch (error) {
      console.error('Error fetching google categories:', error);
      return res.status(500).json({ message: 'Failed to fetch google categories', status: 500 });
    }
  },

  // GET /get/google/category/by-google-id/:googleId
  getGoogleCategoryByGoogleId: async (req, res) => {
    try {
      const googleId = Number(req.params.googleId);
      if (!Number.isFinite(googleId)) {
        return res.status(400).json({ message: 'Invalid googleId', status: 400 });
      }
      const doc = await GoogleCategory.findOne({ googleId }).lean();
      if (!doc) return res.status(404).json({ message: 'Not found', status: 404 });
      return res.json({ message: 'OK', status: 200, googleCategory: doc });
    } catch (error) {
      console.error('Error fetching google category by googleId:', error);
      return res.status(500).json({ message: 'Failed to fetch', status: 500 });
    }
  },

  // GET /get/google/category/:id
  getGoogleCategoryById: async (req, res) => {
    try {
      const doc = await GoogleCategory.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ message: 'Not found', status: 404 });
      return res.json({ message: 'OK', status: 200, googleCategory: doc });
    } catch (error) {
      console.error('Error fetching google category:', error);
      return res.status(500).json({ message: 'Failed to fetch', status: 500 });
    }
  },

  // POST /create/google/category
  createGoogleCategory: async (req, res) => {
    try {
      const {
        googleId,
        name,
        fullPath,
        pathLevels = [],
        level,
        parentGoogleId = null,
        isLeaf = false,
        isActive = true,
        isFeatured = false,
        note = ''
      } = req.body;

      if (!name || !fullPath || level === undefined || googleId === undefined) {
        return res.status(400).json({ message: 'googleId, name, fullPath, and level are required', status: 400 });
      }

      const exists = await GoogleCategory.findOne({ googleId: Number(googleId) }).lean();
      if (exists) return res.status(409).json({ message: 'googleId already exists', status: 409 });

      const created = await GoogleCategory.create({
        googleId: Number(googleId),
        name: String(name).trim(),
        fullPath: String(fullPath).trim(),
        pathLevels: Array.isArray(pathLevels) ? pathLevels : [],
        level: Number(level),
        parentGoogleId: parentGoogleId === null || parentGoogleId === '' ? null : Number(parentGoogleId),
        isLeaf: !!isLeaf,
        isActive: !!isActive,
        isFeatured: !!isFeatured,
        note: String(note || '').trim()
      });

      return res.status(201).json({ message: 'Created', status: 201, googleCategory: created });
    } catch (error) {
      console.error('Error creating google category:', error);
      return res.status(500).json({ message: 'Failed to create', status: 500 });
    }
  },

  // PATCH /update/google/category/:id
  updateGoogleCategory: async (req, res) => {
    try {
      const updatable = ['name', 'fullPath', 'pathLevels', 'level', 'parentGoogleId', 'isLeaf', 'isActive', 'isFeatured', 'note'];
      const payload = {};
      for (const k of updatable) if (k in req.body) payload[k] = req.body[k];
      if (payload.level !== undefined) payload.level = Number(payload.level);
      if (payload.parentGoogleId !== undefined) {
        payload.parentGoogleId =
          payload.parentGoogleId === null || payload.parentGoogleId === '' ? null : Number(payload.parentGoogleId);
      }
      const doc = await GoogleCategory.findByIdAndUpdate(req.params.id, payload, { new: true });
      if (!doc) return res.status(404).json({ message: 'Not found', status: 404 });
      return res.json({ message: 'Updated', status: 200, googleCategory: doc });
    } catch (error) {
      console.error('Error updating google category:', error);
      return res.status(500).json({ message: 'Failed to update', status: 500 });
    }
  },

  // PATCH /status/google/category/:id
  toggleStatusGoogleCategory: async (req, res) => {
    try {
      const doc = await GoogleCategory.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: 'Not found', status: 404 });
      doc.isActive = !doc.isActive;
      await doc.save();
      return res.json({ message: 'Status toggled', status: 200, googleCategory: doc });
    } catch (error) {
      console.error('Error toggling status:', error);
      return res.status(500).json({ message: 'Failed', status: 500 });
    }
  },

  // PATCH /feature/google/category/:id
  toggleFeatureGoogleCategory: async (req, res) => {
    try {
      const doc = await GoogleCategory.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: 'Not found', status: 404 });
      doc.isFeatured = !doc.isFeatured;
      await doc.save();
      return res.json({ message: 'Featured toggled', status: 200, googleCategory: doc });
    } catch (error) {
      console.error('Error toggling featured:', error);
      return res.status(500).json({ message: 'Failed', status: 500 });
    }
  },

  // DELETE /delete/google/category/:id
  deleteGoogleCategory: async (req, res) => {
    try {
      const doc = await GoogleCategory.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ message: 'Not found', status: 404 });
      return res.json({ message: 'Deleted', status: 200 });
    } catch (error) {
      console.error('Error deleting:', error);
      return res.status(500).json({ message: 'Failed', status: 500 });
    }
  },

  // GET /get/google/category/counts
  getGoogleCategoryCounts: async (req, res) => {
    try {
      const [total, active, featured, byLevel] = await Promise.all([
        GoogleCategory.countDocuments({}),
        GoogleCategory.countDocuments({ isActive: true }),
        GoogleCategory.countDocuments({ isFeatured: true }),
        GoogleCategory.aggregate([
          { $group: { _id: '$level', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ])
      ]);
      return res.json({ status: 200, total, active, featured, byLevel });
    } catch (error) {
      console.error('Error getting counts:', error);
      return res.status(500).json({ message: 'Failed', status: 500 });
    }
  },

  // GET /get/google/categories/top-level
  getTopLevelGoogleCategories: async (req, res) => {
    try {
      const query = { level: 1 };
      if (req.query.isActive === 'true' || req.query.activeOnly === '1') {
        query.isActive = true;
      }
      const items = await GoogleCategory.find(query).sort({ name: 1 }).lean();
      return res.json({ status: 200, googleCategories: items });
    } catch (error) {
      console.error('Error fetching top-level:', error);
      return res.status(500).json({ message: 'Failed', status: 500 });
    }
  },

  // GET /get/google/categories/children/:parentGoogleId
  getChildrenOfGoogleCategory: async (req, res) => {
    try {
      const pid = req.params.parentGoogleId === 'null' ? null : Number(req.params.parentGoogleId);
      const query = { parentGoogleId: pid };
      if (req.query.isActive === 'true' || req.query.activeOnly === '1') {
        query.isActive = true;
      }
      const items = await GoogleCategory.find(query).sort({ name: 1 }).lean();
      return res.json({ status: 200, googleCategories: items });
    } catch (error) {
      console.error('Error fetching children:', error);
      return res.status(500).json({ message: 'Failed', status: 500 });
    }
  }
};
