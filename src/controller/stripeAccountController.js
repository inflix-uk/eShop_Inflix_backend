const mongoose = require('mongoose');
const StripeAccount = require('../models/stripeAccount');
const BookingPackage = require('../models/bookingPackage');
const { isStripeTestMode, keyKind } = require('../utils/stripeMode');

/** Never return a full secret to the browser — last 4 characters only. */
const maskKey = (key) => {
  if (!key || key.length < 8) return '';
  return '••••••••' + key.slice(-4);
};

const isMasked = (value) => String(value || '').startsWith('••••');

function validateKeyFormat(value, prefixes, label) {
  const key = String(value || '').trim();
  if (!key) return null;
  if (!prefixes.some((prefix) => key.startsWith(prefix))) {
    return `Invalid ${label} format. Must start with ${prefixes.join(' or ')}`;
  }
  return null;
}

function accountPayload(account, packageCount = 0) {
  const mode = isStripeTestMode() ? 'test' : 'live';
  const secretKind = keyKind(account.secretKey);
  const publishableKind = keyKind(account.publishableKey);

  return {
    _id: account._id,
    label: account.label,
    secretKey: maskKey(account.secretKey),
    publishableKey: maskKey(account.publishableKey),
    webhookSecret: maskKey(account.webhookSecret),
    hasSecretKey: !!account.secretKey,
    hasPublishableKey: !!account.publishableKey,
    hasWebhookSecret: !!account.webhookSecret,
    keyMode: secretKind,
    /** False → this account cannot be used right now and falls back to platform. */
    usableInActiveMode: secretKind === mode && publishableKind === mode,
    activeMode: mode,
    stripeAccountRef: account.stripeAccountRef || '',
    isActive: account.isActive,
    packageCount,
    updatedAt: account.updatedAt,
  };
}

const stripeAccountController = {
  listAccounts: async (req, res) => {
    try {
      const accounts = await StripeAccount.find({ isdeleted: false }).sort({ label: 1 });

      const counts = await BookingPackage.aggregate([
        { $match: { isdeleted: false, stripeAccountId: { $ne: null } } },
        { $group: { _id: '$stripeAccountId', count: { $sum: 1 } } },
      ]);
      const countByAccount = new Map(counts.map((row) => [String(row._id), row.count]));

      return res.json({
        success: true,
        data: accounts.map((account) =>
          accountPayload(account, countByAccount.get(String(account._id)) || 0)
        ),
        activeMode: isStripeTestMode() ? 'test' : 'live',
      });
    } catch (error) {
      console.error('Error listing Stripe accounts:', error);
      return res.status(500).json({ success: false, message: 'Failed to list Stripe accounts' });
    }
  },

  createAccount: async (req, res) => {
    try {
      const { label, secretKey, publishableKey, webhookSecret, isActive } = req.body;

      const name = String(label || '').trim();
      if (!name) {
        return res.status(400).json({ success: false, message: 'Account name is required' });
      }

      if (!secretKey || !publishableKey) {
        return res.status(400).json({
          success: false,
          message: 'Secret key and publishable key are both required',
        });
      }

      const secretError = validateKeyFormat(secretKey, ['sk_test_', 'sk_live_'], 'Secret Key');
      if (secretError) return res.status(400).json({ success: false, message: secretError });

      const publishableError = validateKeyFormat(
        publishableKey,
        ['pk_test_', 'pk_live_'],
        'Publishable Key'
      );
      if (publishableError) {
        return res.status(400).json({ success: false, message: publishableError });
      }

      const webhookError = validateKeyFormat(webhookSecret, ['whsec_'], 'Webhook Secret');
      if (webhookError) return res.status(400).json({ success: false, message: webhookError });

      if (keyKind(secretKey) !== keyKind(publishableKey)) {
        return res.status(400).json({
          success: false,
          message: 'Secret and publishable key must be from the same mode (both test or both live)',
        });
      }

      const duplicate = await StripeAccount.findOne({ label: name, isdeleted: false });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'An account with this name already exists',
        });
      }

      const account = await StripeAccount.create({
        label: name,
        secretKey: String(secretKey).trim(),
        publishableKey: String(publishableKey).trim(),
        webhookSecret: String(webhookSecret || '').trim(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        updatedBy: req.user?.id || null,
      });

      return res.json({
        success: true,
        message: 'Stripe account added',
        data: accountPayload(account),
      });
    } catch (error) {
      console.error('Error creating Stripe account:', error);
      if (error.code === 11000) {
        return res
          .status(400)
          .json({ success: false, message: 'An account with this name already exists' });
      }
      return res.status(500).json({ success: false, message: 'Failed to create Stripe account' });
    }
  },

  updateAccount: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid account id' });
      }

      const account = await StripeAccount.findOne({ _id: id, isdeleted: false });
      if (!account) {
        return res.status(404).json({ success: false, message: 'Stripe account not found' });
      }

      const { label, secretKey, publishableKey, webhookSecret, isActive } = req.body;

      if (label !== undefined) {
        const name = String(label).trim();
        if (!name) {
          return res.status(400).json({ success: false, message: 'Account name is required' });
        }
        const duplicate = await StripeAccount.findOne({
          label: name,
          isdeleted: false,
          _id: { $ne: account._id },
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: 'An account with this name already exists',
          });
        }
        account.label = name;
      }

      // Masked values mean "unchanged" — only real keys overwrite.
      if (secretKey && !isMasked(secretKey)) {
        const error = validateKeyFormat(secretKey, ['sk_test_', 'sk_live_'], 'Secret Key');
        if (error) return res.status(400).json({ success: false, message: error });
        account.secretKey = String(secretKey).trim();
        account.stripeAccountRef = '';
      }

      if (publishableKey && !isMasked(publishableKey)) {
        const error = validateKeyFormat(
          publishableKey,
          ['pk_test_', 'pk_live_'],
          'Publishable Key'
        );
        if (error) return res.status(400).json({ success: false, message: error });
        account.publishableKey = String(publishableKey).trim();
      }

      if (webhookSecret !== undefined && !isMasked(webhookSecret)) {
        const value = String(webhookSecret).trim();
        if (value) {
          const error = validateKeyFormat(value, ['whsec_'], 'Webhook Secret');
          if (error) return res.status(400).json({ success: false, message: error });
        }
        account.webhookSecret = value;
      }

      if (keyKind(account.secretKey) !== keyKind(account.publishableKey)) {
        return res.status(400).json({
          success: false,
          message: 'Secret and publishable key must be from the same mode (both test or both live)',
        });
      }

      if (isActive !== undefined) {
        account.isActive = Boolean(isActive);
      }

      account.updatedBy = req.user?.id || null;
      await account.save();

      return res.json({
        success: true,
        message: 'Stripe account updated',
        data: accountPayload(account),
      });
    } catch (error) {
      console.error('Error updating Stripe account:', error);
      return res.status(500).json({ success: false, message: 'Failed to update Stripe account' });
    }
  },

  deleteAccount: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid account id' });
      }

      // Packages still pointing here would silently fall back to the platform
      // account — make the admin re-point them first.
      const inUse = await BookingPackage.countDocuments({
        stripeAccountId: id,
        isdeleted: false,
      });

      if (inUse > 0) {
        return res.status(400).json({
          success: false,
          message: `${inUse} package${inUse === 1 ? '' : 's'} still use this account. Move them to another account first.`,
        });
      }

      const updated = await StripeAccount.findOneAndUpdate(
        { _id: id, isdeleted: false },
        { isdeleted: true, isActive: false },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Stripe account not found' });
      }

      return res.json({ success: true, message: 'Stripe account removed' });
    } catch (error) {
      console.error('Error deleting Stripe account:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete Stripe account' });
    }
  },

  /** Verify one account's secret key against the Stripe API and cache its acct_ id. */
  testAccount: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid account id' });
      }

      const account = await StripeAccount.findOne({ _id: id, isdeleted: false });
      if (!account) {
        return res.status(404).json({ success: false, message: 'Stripe account not found' });
      }

      if (!account.secretKey) {
        return res.status(400).json({ success: false, message: 'No secret key configured' });
      }

      const stripe = require('stripe')(account.secretKey);
      const stripeAccount = await stripe.accounts.retrieve();

      account.stripeAccountRef = stripeAccount.id;
      await account.save();

      return res.json({
        success: true,
        message: 'Stripe connection successful',
        data: {
          accountId: stripeAccount.id,
          mode: keyKind(account.secretKey),
          usableInActiveMode: keyKind(account.secretKey) === (isStripeTestMode() ? 'test' : 'live'),
        },
      });
    } catch (error) {
      console.error('Error testing Stripe account:', error);
      return res.status(400).json({
        success: false,
        message: 'Stripe connection failed',
        error: error.message,
      });
    }
  },

  /** Slim list for the package modal dropdown — no keys, active accounts only. */
  listSelectable: async (req, res) => {
    try {
      const accounts = await StripeAccount.find({ isdeleted: false, isActive: true })
        .select('label stripeAccountRef secretKey publishableKey')
        .sort({ label: 1 });

      const mode = isStripeTestMode() ? 'test' : 'live';

      return res.json({
        success: true,
        data: accounts.map((account) => ({
          _id: account._id,
          label: account.label,
          stripeAccountRef: account.stripeAccountRef || '',
          usableInActiveMode:
            keyKind(account.secretKey) === mode && keyKind(account.publishableKey) === mode,
        })),
        activeMode: mode,
      });
    } catch (error) {
      console.error('Error listing selectable Stripe accounts:', error);
      return res.status(500).json({ success: false, message: 'Failed to list Stripe accounts' });
    }
  },
};

module.exports = stripeAccountController;
