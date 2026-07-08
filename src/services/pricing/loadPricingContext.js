const mongoose = require('mongoose');
const GroupProductPrice = require('../../models/groupProductPrice');
const UserProductPrice = require('../../models/userProductPrice');
const PricingGroup = require('../../models/pricingGroup');
const User = require('../../models/user');
const { buildPricingContextFromData } = require('./buildPricingContext');

/**
 * Load group/user override rows and exclusions from MongoDB.
 * @param {{ groupId?: string|null, userId?: string|null }} scope
 */
async function loadPricingContext(scope = {}) {
  const scopedGroupId = scope.groupId || null;
  const scopedUserId = scope.userId || null;

  const [groupOverrides, userOverrides, groupDoc, userDoc] = await Promise.all([
    scopedGroupId && mongoose.Types.ObjectId.isValid(scopedGroupId)
      ? GroupProductPrice.find({ groupId: scopedGroupId })
          .select('productId price variantKey')
          .lean()
      : Promise.resolve([]),
    scopedUserId && mongoose.Types.ObjectId.isValid(scopedUserId)
      ? UserProductPrice.find({ userId: scopedUserId })
          .select('productId price variantKey')
          .lean()
      : Promise.resolve([]),
    scopedGroupId && mongoose.Types.ObjectId.isValid(scopedGroupId)
      ? PricingGroup.findById(scopedGroupId).select('excludedProductIds').lean()
      : Promise.resolve(null),
    scopedUserId && mongoose.Types.ObjectId.isValid(scopedUserId)
      ? User.findById(scopedUserId).select('excludedProductIds').lean()
      : Promise.resolve(null),
  ]);

  return buildPricingContextFromData({
    groupOverrides,
    userOverrides,
    groupDoc,
    userDoc,
  });
}

module.exports = {
  loadPricingContext,
};
