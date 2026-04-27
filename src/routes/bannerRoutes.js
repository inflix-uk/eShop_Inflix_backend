// routes/bannerRoutes.js
const express = require('express');
const router = express.Router();
const bannerController = require('../controller/bannerController');
const requireAdmin = require('../../middleware/requireAdmin');
const { handleBannerUpload } = require('../controller/bannerController');

// Public route - Get active banners
router.get('/get/banners/active', bannerController.getActiveBanners);

// Admin routes - All require authentication
router.get('/get/admin/banners/hero-social', requireAdmin, bannerController.getHeroSocialAdmin);
router.put('/update/banners/hero-social', requireAdmin, bannerController.updateHeroSocial);
router.get('/get/all/banners', requireAdmin, bannerController.getAllBanners);
router.get('/get/banner/:id', requireAdmin, bannerController.getBannerById);
router.post('/create/banner', requireAdmin, handleBannerUpload, bannerController.createBanner);
router.put('/update/banner/:id', requireAdmin, handleBannerUpload, bannerController.updateBanner);
router.delete('/delete/banner/:id', requireAdmin, bannerController.deleteBanner);
router.patch('/toggle/banner/:id', requireAdmin, bannerController.toggleBannerStatus);
router.put('/reorder/banners', requireAdmin, bannerController.reorderBanners);

module.exports = router;
