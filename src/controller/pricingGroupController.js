const mongoose = require('mongoose');
const PricingGroup = require('../models/pricingGroup');
const GroupProductPrice = require('../models/groupProductPrice');
const Product = require('../models/product');

function sanitizeText(value) {
  if (value == null) return '';
  return String(value).trim();
}

const createPricingGroup = async (req, res) => {
  try {
    const name = sanitizeText(req.body?.name);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required',
      });
    }

    const exists = await PricingGroup.findOne({ name });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'Pricing group with this name already exists',
      });
    }

    const doc = await PricingGroup.create({
      name,
    });

    return res.status(201).json({
      success: true,
      message: 'Pricing group created successfully',
      data: doc,
    });
  } catch (error) {
    console.error('createPricingGroup:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create pricing group',
      error: error.message,
    });
  }
};

const getAllPricingGroups = async (req, res) => {
  try {
    const groups = await PricingGroup.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error('getAllPricingGroups:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing groups',
    });
  }
};

const getPricingGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pricing group id',
      });
    }

    const group = await PricingGroup.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Pricing group not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error('getPricingGroupById:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing group',
    });
  }
};

const updatePricingGroup = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pricing group id',
      });
    }

    const update = {};
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'name')) {
      const name = sanitizeText(req.body.name);
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Group name cannot be empty',
        });
      }
      const duplicate = await PricingGroup.findOne({ name, _id: { $ne: id } });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Pricing group with this name already exists',
        });
      }
      update.name = name;
    }

    const updated = await PricingGroup.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Pricing group not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Pricing group updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('updatePricingGroup:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update pricing group',
      error: error.message,
    });
  }
};

const deletePricingGroup = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pricing group id',
      });
    }

    const deleted = await PricingGroup.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Pricing group not found',
      });
    }

    await GroupProductPrice.deleteMany({ groupId: id });

    return res.status(200).json({
      success: true,
      message: 'Pricing group deleted successfully',
    });
  } catch (error) {
    console.error('deletePricingGroup:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete pricing group',
      error: error.message,
    });
  }
};

const upsertGroupProductPrice = async (req, res) => {
  try {
    const groupId = req.params.id;
    const productId = String(req.body?.productId || '').trim();
    const price = Number(req.body?.price);

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid group id' });
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid price value' });
    }

    const groupExists = await PricingGroup.exists({ _id: groupId });
    if (!groupExists) {
      return res.status(404).json({ success: false, message: 'Pricing group not found' });
    }
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const saved = await GroupProductPrice.findOneAndUpdate(
      { groupId, productId },
      { $set: { price } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Group product price saved',
      data: saved,
    });
  } catch (error) {
    console.error('upsertGroupProductPrice:', error);
    return res.status(500).json({ success: false, message: 'Failed to save group product price' });
  }
};

const getGroupProductPrices = async (req, res) => {
  try {
    const groupId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid group id' });
    }
    const prices = await GroupProductPrice.find({ groupId }).lean();
    return res.status(200).json({ success: true, data: prices });
  } catch (error) {
    console.error('getGroupProductPrices:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch group product prices' });
  }
};

module.exports = {
  createPricingGroup,
  getAllPricingGroups,
  getPricingGroupById,
  updatePricingGroup,
  deletePricingGroup,
  upsertGroupProductPrice,
  getGroupProductPrices,
};
