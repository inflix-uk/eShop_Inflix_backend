// controller/adminUsersController.js

const db = require("../../connections/mongo");
const mongoose = require("mongoose");
const User = require("../models/user");
const PricingGroup = require("../models/pricingGroup");
const Product = require("../models/product");
const UserProductPrice = require("../models/userProductPrice");
const { computeVariantKey } = require("../utils/pricingVariantKey");
const bcrypt = require("bcrypt");

let legacyUserVariantKeysEnsured = false;
async function ensureLegacyUserProductVariantKeys() {
  if (legacyUserVariantKeysEnsured) return;
  legacyUserVariantKeysEnsured = true;
  try {
    await UserProductPrice.updateMany(
      { $or: [{ variantKey: { $exists: false } }, { variantKey: null }] },
      { $set: { variantKey: "" } }
    );
  } catch (e) {
    console.warn("ensureLegacyUserProductVariantKeys:", e.message);
  }
}
const crypto = require("crypto");

const adminUsersController = {
  getAllUser: (req, res) => {
    const users = User.find()
      .lean()
      .then((users) => {
        res.json(users);
      })
      .catch((err) => {
        res.status(500).json({ error: err.message });
      });
  },

  // New method to get all users with only name, email, and ID
  getAllUsersBasicInfo: (req, res) => {
    User.find({}, 'firstname lastname email phoneNumber _id pricingGroup')
      .lean()
      .then((users) => {
        const formattedUsers = users.map(user => ({
          id: user._id,
          name: `${user.firstname} ${user.lastname}`,
          email: user.email,
          phoneNumber: user.phoneNumber,
          pricingGroup: user.pricingGroup || null,
        }));
        res.json({
          users: formattedUsers,
          status: 201,
          message: "Users retrieved successfully"
        });
      })
      .catch((err) => {
        console.error("Error retrieving users:", err);
        res.status(500).json({ error: "Internal server error", status: 500 });
      });
  },

  assignPricingGroup: async (req, res) => {
    try {
      const { id } = req.params;
      const pricingGroupIdRaw = req.body?.pricingGroup || null;
      const pricingGroupId = pricingGroupIdRaw ? String(pricingGroupIdRaw).trim() : null;

      if (!id) {
        return res.status(400).json({ status: 400, message: "User id is required" });
      }

      if (pricingGroupId) {
        const group = await PricingGroup.findById(pricingGroupId).lean();
        if (!group) {
          return res.status(404).json({ status: 404, message: "Pricing group not found" });
        }
      }

      const user = await User.findByIdAndUpdate(
        id,
        { $set: { pricingGroup: pricingGroupId || null } },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ status: 404, message: "User not found" });
      }

      return res.status(200).json({
        status: 200,
        message: "User pricing group updated successfully",
        user,
      });
    } catch (err) {
      console.error("Error assigning pricing group:", err);
      return res.status(500).json({ status: 500, message: "Internal server error" });
    }
  },

  setUserProductInclusion: async (req, res) => {
    try {
      const { id } = req.params;
      const productId = String(req.body?.productId || "").trim();
      const included = req.body?.included !== false;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid user id" });
      }
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ success: false, message: "Invalid product id" });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      const productExists = await Product.exists({ _id: productId });
      if (!productExists) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      if (included) {
        await User.updateOne({ _id: id }, { $pull: { excludedProductIds: productId } });
      } else {
        await User.updateOne({ _id: id }, { $addToSet: { excludedProductIds: productId } });
        await UserProductPrice.deleteMany({ userId: id, productId });
      }

      const updated = await User.findById(id).lean();
      return res.status(200).json({
        success: true,
        message: included ? "Product included for user pricing" : "Product excluded from user pricing",
        data: updated,
      });
    } catch (err) {
      console.error("setUserProductInclusion:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to update product inclusion",
        error: err.message,
      });
    }
  },

  getUserProductPrices: async (req, res) => {
    try {
      await ensureLegacyUserProductVariantKeys();
      const { id } = req.params;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid user id" });
      }

      const userExists = await User.exists({ _id: id });
      if (!userExists) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const rows = await UserProductPrice.find({ userId: id }).lean();
      return res.status(200).json({ success: true, data: rows });
    } catch (err) {
      console.error("Error fetching user product prices:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch user product prices" });
    }
  },

  upsertUserProductPrice: async (req, res) => {
    try {
      await ensureLegacyUserProductVariantKeys();
      const { id } = req.params;
      const productId = String(req.body?.productId || "").trim();
      const priceRaw = req.body?.price;
      const variantKey = req.body?.variantKey != null ? String(req.body.variantKey).trim() : "";

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid user id" });
      }
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ success: false, message: "Invalid product id" });
      }

      const userExists = await User.exists({ _id: id });
      if (!userExists) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      const productExists = await Product.exists({ _id: productId });
      if (!productExists) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      if (variantKey) {
        const product = await Product.findById(productId).select("variantValues").lean();
        const keys = (product?.variantValues || []).map((v, i) => computeVariantKey(v, i));
        if (!keys.includes(variantKey)) {
          return res.status(400).json({
            success: false,
            message: "variantKey does not match any variant on this product",
          });
        }
      }

      const filter = variantKey
        ? { userId: id, productId, variantKey }
        : { userId: id, productId, variantKey: "" };

      const clearRequested =
        req.body?.clear === true ||
        priceRaw === "" ||
        priceRaw === null ||
        priceRaw === undefined ||
        (typeof priceRaw === "string" && String(priceRaw).trim() === "");

      if (clearRequested) {
        await UserProductPrice.deleteOne(filter);
        return res.status(200).json({
          success: true,
          message: "User product price removed",
          data: null,
        });
      }

      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ success: false, message: "Invalid price value" });
      }

      const saved = await UserProductPrice.findOneAndUpdate(
        filter,
        { $set: { price, variantKey } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({
        success: true,
        message: "User product price saved",
        data: saved,
      });
    } catch (err) {
      console.error("Error saving user product price:", err);
      return res.status(500).json({ success: false, message: "Failed to save user product price" });
    }
  },

  getUserById: (req, res) => {
    const { id } = req.params;

    User.findById(id)
      .then((user) => {
        if (!user) {
          return res.json({ error: "User not found", status: 404 });
        }
        console.log(user);

        // If user found, send it as JSON response
        res.json({ user , status: 201, message: "User found successfully" });
      })
      .catch((err) => {
        console.error("Error finding user by ID:", err);
        res.status(500).json({ error: "Internal server error" });
      });
  },

  updateUser: (req, res) => {
    const { id } = req.params;
    const { name, email, password } = req.body;
    User.findByIdAndUpdate(id, { name, email, password }, { new: true })
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        res.status(500).json({ error: err.message });
      });
  },

  deleteUser: (req, res) => {
    const { id } = req.params;
    User.findByIdAndDelete(id)
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        res.status(500).json({ error: err.message });
      });
  },
  statusUser: (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    User.findByIdAndUpdate(id, { status }, { new: true })
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        res.status(500).json({ error: err.message });
      });
  },

  // Admin-side password reset
  resetUserPassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword, confirmPassword } = req.body;

      // Validate input
      if (!newPassword || !confirmPassword) {
        return res.status(400).json({
          error: "Both password fields are required",
          status: 400
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          error: "Passwords do not match",
          status: 400
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: "Password must be at least 6 characters long",
          status: 400
        });
      }

      // Find user
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          status: 404
        });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update user's password
      user.password = hashedPassword;
      await user.save();

      res.json({
        message: "Password reset successfully",
        status: 200
      });

    } catch (err) {
      console.error("Error resetting password:", err);
      res.status(500).json({
        error: "Internal server error",
        status: 500
      });
    }
  },
};
module.exports = adminUsersController;
