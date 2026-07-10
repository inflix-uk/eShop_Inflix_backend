// routes/index.js
// ========================================================================
// DEPENDENCIES & SETUP
// ========================================================================
var express = require('express');
var router = express.Router();

// ========================================================================
// MAIN E-COMMERCE CONTROLLERS
// ========================================================================
const usersController = require('../controller/users');
const adminUsersController = require('../controller/adminUsersController');
const blogController = require('../controller/blogController');
const blogCategoryController = require('../controller/blogCategoryController');
const blogTagsController = require('../controller/blogTagsController');
const productCategoriesController = require('../controller/productCategoriesController');
const googleCategoriesController = require('../controller/googleCategoriesController');
const productTagsController = require('../controller/productTagsController');
const adminProductController = require('../controller/adminProductController');
const productReviewsController = require('../controller/productReviewsController');
const productFaqController = require('../controller/productFaqController');
const productRelatedController = require('../controller/productRelatedController');
const ordersController = require('../controller/orderController');
const returnOrderController = require('../controller/returnOrderController');
const requestOrderController = require('../controller/requestOrderController');
const returnOrderOptionsController = require('../controller/returnOrderOptionsController');
const couponController = require('../controller/couponController');
const paymentsController = require('../controller/paymentsController');
const adminStatsController = require('../controller/statsController');
const messageController = require('../controller/messageController');
const preloadedMessageController = require('../controller/preloadedMessageController');
const aiMessageController = require('../controller/aiMessageController');
const visitorMessageController = require('../controller/visitorMessageController');
const labelController = require('../controller/labelController');
const staticMetaController = require('../controller/staticMetaController');
const dealsController = require('../controller/dealsController');
const siteMapController = require('../controller/siteMapController');
const optimizedSitemapController = require('../controller/optimizedSitemapController');
const storefrontSitemapController = require('../controller/storefrontSitemapController');
const categoryDisplayProductsController = require('../controller/categoryDisplayProductsController');
const footerSettingsController = require('../controller/footerSettingsController');
const stripeSettingsController = require('../controller/stripeSettingsController');
const smtpSettingsController = require('../controller/smtpSettingsController');
const publicContactController = require('../controller/publicContactController');
const contactUsWidgetController = require('../controller/contactUsWidgetController');
const shippingSettingsController = require('../controller/shippingSettingsController');
const productCardSettingsController = require('../controller/productCardSettingsController');
const robotsSettingsController = require('../controller/robotsSettingsController');
const homepageDataController = require('../controller/homepageDataController');
const homepageNavLinksController = require('../controller/homepageNavLinksController');
const pricingGroupController = require('../controller/pricingGroupController');

// ========================================================================
// NEW BLOG SYSTEM CONTROLLERS
// ========================================================================
const { createBlogPost, updateBlogPost, getBlogPostById, getAllBlogPosts, deleteBlogPost, handleBlogUpload, getBlogPostBySlug, getBlogPostBySlugWithoutCache, syncBlogPersonProfile } = require('../controller/newblog/BlogController');
const { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory, getCategoryStats } = require('../controller/newblog/BlogCategoryController');

// ========================================================================
// FOOTER PAGES CONTROLLERS
// ========================================================================
const { createFooterPage, updateFooterPage, getFooterPageById, getFooterPageBySlug, getAllFooterPages, deleteFooterPage, handleFooterPageUpload } = require('../controller/footerPageController');
const {
  getAllPageCategories,
  createPageCategory,
  updatePageCategory,
  deletePageCategory,
} = require('../controller/pageCategoryController');

// ========================================================================
// MIDDLEWARE & OTHER IMPORTS
// ========================================================================
const roleAndPermissons = require('../controller/roleAndPermissons');
const requireAuth = require('../../middleware/requireAuth');
const requireAdmin = require('../../middleware/requireAdmin');
const resolvePricingScope = require('../../middleware/resolvePricingScope');
const optionalAuth = require('../../middleware/optionalAuth');
const paymentIntentRateLimit = require('../../middleware/paymentIntentRateLimit');
const {
  userLoginRateLimit,
  superadminLoginRateLimit,
} = require('../../middleware/loginRateLimits');
const {
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
} = require('../../middleware/passwordResetRateLimits');
const { registerRateLimit } = require('../../middleware/registrationRateLimits');
// Shared HTTP cache headers for public storefront GETs (see middleware/publicCache.js).
const publicCache = require('../../middleware/publicCache');
const resolveStoreByDomain = require('../middleware/resolveStoreByDomain');
const cronRoutes = require('./cronRoutes');
const order = require('../models/order');
const healthController = require('../controller/healthController');
const auditLogController = require('../controller/auditLogController');
const superadminControlsController = require('../controller/superadminControlsController');
const requireSuperadmin = require('../../middleware/requireSuperadmin');

// Optional JWT on all API routes — sets req.user when cookie present (no 401).
router.use(optionalAuth);

// ========================================================================
// LIVENESS (no DB / external deps — used by storefront SSR probes)
// ========================================================================
router.get('/health', healthController.getHealth);

// ========================================================================
// PAYMENT ROUTES (Stripe & PayPal)
// ========================================================================
router.get('/config',                           paymentsController.config);
router.post('/create-payment-intent',           paymentsController.createPaymentIntent);
router.post('/update-payment-intent-metadata',  paymentIntentRateLimit, paymentsController.updatePaymentIntentMetadata);
router.post('/checkout-log',                    paymentsController.logCheckoutEvent);
router.post('/update-payment-intent-amount',    paymentIntentRateLimit, paymentsController.updatePaymentIntentAmount);
router.post('/retrieve-payment-details',        paymentIntentRateLimit, paymentsController.retrievePaymentDetails);
router.post('/retrieve-payment-details-session',paymentIntentRateLimit, paymentsController.retrievePaymentDetailsSession);
router.post("/create-checkout-session",         paymentsController.createCheckoutSession);
router.post('/payment',                         paymentsController.verifyPaymentPaypal);
router.get('/success',                          paymentsController.successPaymentPaypal);
// router.get('/failed', paymentsController.failedPaymentPaypal);

// ========================================================================
// STRIPE SETTINGS MANAGEMENT
// ========================================================================
router.get('/stripe/settings',                  ...requireAdmin, stripeSettingsController.getSettings);
router.post('/stripe/settings',                 ...requireAdmin, stripeSettingsController.saveSettings);
router.post('/stripe/test-connection',          ...requireAdmin, stripeSettingsController.testConnection);

// ========================================================================
// SMTP SETTINGS MANAGEMENT
// ========================================================================
router.get('/smtp/settings',                    ...requireAdmin, smtpSettingsController.getSettings);
router.post('/smtp/settings',                   ...requireAdmin, smtpSettingsController.saveSettings);
router.post('/smtp/test-connection',            ...requireAdmin, smtpSettingsController.testConnection);

// ========================================================================
// SHIPPING SETTINGS MANAGEMENT
// ========================================================================
router.get('/shipping/settings',                ...requireAdmin, shippingSettingsController.getSettings);
router.get('/shipping/methods/active',          shippingSettingsController.getActiveMethods);
router.post('/shipping/methods',                ...requireAdmin, shippingSettingsController.addMethod);
router.patch('/shipping/methods/:methodId',     ...requireAdmin, shippingSettingsController.updateMethod);
router.delete('/shipping/methods/:methodId',    ...requireAdmin, shippingSettingsController.deleteMethod);
router.patch('/shipping/methods/:methodId/toggle', ...requireAdmin, shippingSettingsController.toggleMethodStatus);
router.patch('/shipping/free-shipping',         ...requireAdmin, shippingSettingsController.updateFreeShipping);
router.post('/shipping/methods/reorder',        ...requireAdmin, shippingSettingsController.reorderMethods);

// ========================================================================
// PRODUCT CARD SETTINGS MANAGEMENT
// ========================================================================
router.get('/product-card/settings',            ...requireAdmin, productCardSettingsController.getSettings);
router.get('/product-card/settings/public',     productCardSettingsController.getSettingsPublic);
router.put('/product-card/settings',            ...requireAdmin, productCardSettingsController.updateSettings);

// ========================================================================
// USER AUTHENTICATION & REGISTRATION
// ========================================================================
// User registration from different sources
router.post('/register',                      registerRateLimit, usersController.registerUser);
router.post('/registerUser/fromAdmin',        ...requireAdmin, usersController.registerUserFromAdmin);

// Authentication & password management
router.post('/login',                         userLoginRateLimit, usersController.loginUser);
router.post('/superadmin/login',              superadminLoginRateLimit, usersController.superadminLogin);
router.post('/logout',                        usersController.logoutUser);
router.get('/auth/me',                        requireAuth, usersController.getSessionUser);
router.patch('/update/user/:id',              requireAuth, usersController.updateUser);
router.post('/forgotpassword',                forgotPasswordRateLimit, usersController.forgotPassword);
router.post('/resetpassword',                 resetPasswordRateLimit, usersController.resetPassword);
router.patch('/changepassword/:id',           requireAuth, usersController.changepassword);
router.get('/superadmin/controls/public',     superadminControlsController.getPublicSuperadminControls);
router.get('/superadmin/controls',            ...requireSuperadmin, superadminControlsController.getSuperadminControls);
router.put('/superadmin/controls',            ...requireSuperadmin, superadminControlsController.updateSuperadminControls);

// ========================================================================
// USER MANAGEMENT (Admin Panel)
// ========================================================================
router.get('/get/all/users',                   ...requireAdmin, adminUsersController.getAllUser);
router.get('/get/users/basic-info',              ...requireAdmin, adminUsersController.getAllUsersBasicInfo);
// router.patch('/update/user/:id',              adminUsersController.updateUser);
router.patch('/delete/user/:id',                 ...requireAdmin, adminUsersController.deleteUser);
router.patch('/status/user/:id',                 ...requireAdmin, adminUsersController.statusUser);
router.get('/get/user/:id',                      ...requireAdmin, adminUsersController.getUserById);
router.patch('/admin/reset-password/:id',        ...requireAdmin, adminUsersController.resetUserPassword);
router.put('/api/users/:id/assign-group',        ...requireAdmin, adminUsersController.assignPricingGroup);
router.get('/api/users/:id/product-prices',      ...requireAdmin, adminUsersController.getUserProductPrices);
router.post('/api/users/:id/product-price',      ...requireAdmin, adminUsersController.upsertUserProductPrice);
router.post('/api/users/:id/product-inclusion',  ...requireAdmin, adminUsersController.setUserProductInclusion);

// ========================================================================
// CRM — CUSTOMER 360 (Customers list, profile, notes)
// ========================================================================
const customer360Controller = require('../controller/customer360Controller');
router.get('/admin/crm/customers',                       ...requireAdmin, customer360Controller.listCustomers);
router.get('/admin/crm/customers/:userId/360',           ...requireAdmin, customer360Controller.getCustomer360);
router.get('/admin/crm/customers/:userId/notes',         ...requireAdmin, customer360Controller.listNotes);
router.post('/admin/crm/customers/:userId/notes',        ...requireAdmin, customer360Controller.createNote);
router.patch('/admin/crm/customers/:userId/notes/:noteId', ...requireAdmin, customer360Controller.updateNote);
router.delete('/admin/crm/customers/:userId/notes/:noteId', ...requireAdmin, customer360Controller.deleteNote);

// ========================================================================
// PRICING GROUPS MANAGEMENT
// ========================================================================
router.post('/pricing-groups', ...requireAdmin, pricingGroupController.createPricingGroup);
router.get('/pricing-groups', ...requireAdmin, pricingGroupController.getAllPricingGroups);
router.get('/pricing-groups/:id', ...requireAdmin, pricingGroupController.getPricingGroupById);
router.put('/pricing-groups/:id', ...requireAdmin, pricingGroupController.updatePricingGroup);
router.delete('/pricing-groups/:id', ...requireAdmin, pricingGroupController.deletePricingGroup);
router.post('/pricing-groups/:id/product-price', ...requireAdmin, pricingGroupController.upsertGroupProductPrice);
router.post('/pricing-groups/:id/product-inclusion', ...requireAdmin, pricingGroupController.setGroupProductInclusion);
router.get('/pricing-groups/:id/product-prices', ...requireAdmin, pricingGroupController.getGroupProductPrices);

// API aliases for pricing groups
router.post('/api/pricing-groups', ...requireAdmin, pricingGroupController.createPricingGroup);
router.get('/api/pricing-groups', ...requireAdmin, pricingGroupController.getAllPricingGroups);
router.put('/api/pricing-groups/:id', ...requireAdmin, pricingGroupController.updatePricingGroup);
router.delete('/api/pricing-groups/:id', ...requireAdmin, pricingGroupController.deletePricingGroup);
router.post('/api/pricing-groups/:id/product-price', ...requireAdmin, pricingGroupController.upsertGroupProductPrice);
router.post('/api/pricing-groups/:id/product-inclusion', ...requireAdmin, pricingGroupController.setGroupProductInclusion);

// ========================================================================
// BLOG MANAGEMENT (Main E-commerce)
// ========================================================================
// Blog Posts CRUD
router.post('/create/newblog',                    ...requireAdmin, blogController.createBlog);
router.get('/get/blog',                           blogController.getAllBlogFull);
router.get('/get/blog/latest',                    blogController.getAllBlogLatest);
router.get('/get/blog/latest/old',                blogController.getAllBlogLatestOnlyOld);
router.get('/get/blog/:id',                       blogController.getBlog);
router.get('/get/blog/metadata/:permalink',       blogController.getBlogMetaData);
router.patch('/update/blog/:id',                  ...requireAdmin, blogController.updateBlog);
router.delete('/delete/blog/:id',                 ...requireAdmin, blogController.deleteBlog);
router.patch('/status/blog/:id',                  ...requireAdmin, blogController.statusBlog);
router.patch('/feature/blog/:id',                 ...requireAdmin, blogController.featureBlog);

// Blog Categories
router.post('/create/blog/category',                ...requireAdmin, blogCategoryController.createBlogCategory);
router.get('/get/blog/category/all',                blogCategoryController.getAllCategory);
router.delete('/delete/blog/category/:id',          ...requireAdmin, blogCategoryController.deleteBlogCategory);
router.patch('/feature/blog/category/:id',          ...requireAdmin, blogCategoryController.featureBlogCategory);
router.patch('/status/blog/category/:id',           ...requireAdmin, blogCategoryController.statusBlogCategory);
router.patch('/update/blog/category/:id',           ...requireAdmin, blogCategoryController.updateBlogCategory);

// Blog Tags
router.post('/create/blog/tag',                     ...requireAdmin, blogTagsController.createBlogTag);
router.get('/get/blog/tag/all',                     blogTagsController.getAllBlogTag);
router.delete('/delete/blog/tag/:id',               ...requireAdmin, blogTagsController.deleteBlogTag);
router.patch('/update/blog/tag/:id',                ...requireAdmin, blogTagsController.updateBlogTag);
router.patch('/publish/blog/tag/:id',               ...requireAdmin, blogTagsController.publishBlogTag);

// ========================================================================
// PRODUCT TAGS MANAGEMENT
// ========================================================================
router.post('/create/product/tag',                    ...requireAdmin, productTagsController.createProductTag);
router.get('/get/product/tag',                        productTagsController.getAllProductTag);
router.delete('/delete/product/tag/:id',              ...requireAdmin, productTagsController.deleteProductTag);
router.patch('/update/product/tag/:id',               ...requireAdmin, productTagsController.updateProductTag);
router.patch('/publish/product/tag/:id',              ...requireAdmin, productTagsController.publishProductTag);

// ========================================================================
// PRODUCT CATEGORIES MANAGEMENT
// ========================================================================
router.post('/create/product/category',               ...requireAdmin, productCategoriesController.createProductCategory);
router.get('/get/product/category',                   productCategoriesController.getAllProductCategory);
router.get('/get/category/ssr',                       productCategoriesController.getCategoryServersideRendering);
router.get('/get/product/category/customized',        publicCache.medium, productCategoriesController.getProductCategoryCustomized);
router.delete('/delete/product/category/:id',         ...requireAdmin, productCategoriesController.deleteProductCategory);
router.patch('/feature/product/category/:id',         ...requireAdmin, productCategoriesController.featureProductCategory);
router.patch('/status/product/category/:id',          ...requireAdmin, productCategoriesController.statusProductCategory);
router.patch('/update/product/category/:id',          ...requireAdmin, productCategoriesController.updateProductCategory);
router.patch('/update/product/subcategory/:id',       ...requireAdmin, productCategoriesController.updateProductsubCategory);
router.get('/get/category/byid/:id',                  productCategoriesController.getCategoryById)
router.post('/product/subcategory',                   ...requireAdmin, productCategoriesController.createProductSubCategory);
router.get('/get/category/Details/:id',               productCategoriesController.getCategoryDetailsById);
router.post('/create/category/for/navbar',            ...requireAdmin, productCategoriesController.createCategoryForNavbar);
router.get('/get/category/for/navbar',                publicCache.long, productCategoriesController.getCategoryForNavbar);
router.get('/get/categorydetails/:slug',              productCategoriesController.getCategoryDetails);
router.get('/get/categorydetailsFull/:id',            productCategoriesController.getCategoryDetailsfull);
router.get('/get/subcategorydetails/:name',           productCategoriesController.getSubCategoryDetails);
router.get('/get/subcategory/somedetails/:name',      productCategoriesController.getSubCategoryDetailsSome);
router.get('/get/categories/counts',                  publicCache.medium, productCategoriesController.getCategoryCounts);

// ========================================================================
// GOOGLE CATEGORIES MANAGEMENT
// ========================================================================
router.get('/get/google/categories',                       googleCategoriesController.getAllGoogleCategories);
router.get('/get/google/categories/counts',                googleCategoriesController.getGoogleCategoryCounts);
router.get('/get/google/categories/top-level',             googleCategoriesController.getTopLevelGoogleCategories);
router.get('/get/google/categories/children/:parentGoogleId', googleCategoriesController.getChildrenOfGoogleCategory);
router.get('/get/google/category/by-google-id/:googleId',  googleCategoriesController.getGoogleCategoryByGoogleId);
router.get('/get/google/category/:id',                     googleCategoriesController.getGoogleCategoryById);
router.post('/create/google/category',                     ...requireAdmin, googleCategoriesController.createGoogleCategory);
router.patch('/update/google/category/:id',                ...requireAdmin, googleCategoriesController.updateGoogleCategory);
router.patch('/status/google/category/:id',                ...requireAdmin, googleCategoriesController.toggleStatusGoogleCategory);
router.patch('/feature/google/category/:id',               ...requireAdmin, googleCategoriesController.toggleFeatureGoogleCategory);
router.delete('/delete/google/category/:id',               ...requireAdmin, googleCategoriesController.deleteGoogleCategory);

// ========================================================================
// CATEGORY DISPLAY PRODUCTS MANAGEMENT
// ========================================================================
router.post('/category/display-products',              ...requireAdmin, categoryDisplayProductsController.saveDisplayProducts);
router.get('/category/display-products/name/:categoryName', categoryDisplayProductsController.getDisplayProductsByName);
router.get('/category/display-products/:categoryId',   categoryDisplayProductsController.getDisplayProducts);
router.delete('/category/display-products/:categoryId/:productId', ...requireAdmin, categoryDisplayProductsController.removeDisplayProduct);
router.get('/category/display-products',               categoryDisplayProductsController.getAllDisplayProducts);

// ========================================================================
// VARIANT ATTRIBUTES MANAGEMENT
// ========================================================================
const variantAttributeController = require('../controller/variantAttributeController');
router.get('/get/variant-attributes',                         variantAttributeController.getAllVariantAttributes);
router.get('/get/variant-attributes/active',                  variantAttributeController.getActiveVariantAttributes);
router.get('/get/variant-attributes/names',                   variantAttributeController.getActiveVariantAttributeNames);
router.get('/get/variant-attribute/:id/values',               variantAttributeController.getVariantAttributeValues);
router.get('/get/brands-with-product-count',                  variantAttributeController.getBrandsWithProductCount);
router.get('/get/variant-attribute/:id',                      variantAttributeController.getVariantAttributeById);
router.post('/create/variant-attribute',                      ...requireAdmin, variantAttributeController.createVariantAttribute);
router.put('/update/variant-attribute/:id',                   ...requireAdmin, variantAttributeController.updateVariantAttribute);
router.put('/update/variant-attribute-value/:id/:valueSlug',  ...requireAdmin, variantAttributeController.updateVariantAttributeValue);
router.delete('/delete/variant-attribute/:id',                ...requireAdmin, variantAttributeController.deleteVariantAttribute);
router.post('/add/variant-attribute-value/:id',               ...requireAdmin, variantAttributeController.addValueToAttribute);
router.delete('/delete/variant-attribute-value/:id/:valueSlug', ...requireAdmin, variantAttributeController.deleteValueFromAttribute);
router.put('/update/variant-attribute-value-details/:id/:valueSlug', ...requireAdmin, variantAttributeController.updateValueDetails);
router.post('/add/variant-attribute-model/:id/:valueSlug',    ...requireAdmin, variantAttributeController.addModelToValue);
router.delete('/delete/variant-attribute-model/:id/:valueSlug/:modelSlug', ...requireAdmin, variantAttributeController.deleteModelFromValue);
router.put('/update/variant-attribute-model/:id/:valueSlug/:modelSlug', ...requireAdmin, variantAttributeController.updateModelStatus);
router.put('/update/variant-attribute-model-details/:id/:valueSlug/:modelSlug', ...requireAdmin, variantAttributeController.updateModelDetails);

// ========================================================================
// PRODUCT MANAGEMENT (Admin Panel)
// ========================================================================
// Product CRUD Operations
router.post('/create/product',                        ...requireAdmin, adminProductController.createProduct); 
router.patch('/update/product/:id',                   ...requireAdmin, adminProductController.updateProduct);
router.patch('/status/product/:id',                   ...requireAdmin, adminProductController.statusProduct); 
router.patch('/feature/product/:id',                  ...requireAdmin, adminProductController.featureProduct);
router.get('/get/product',                            resolvePricingScope, adminProductController.getAllActiveProduct);
router.get('/api/products',                           resolvePricingScope, adminProductController.getAllActiveProduct);
router.get('/get/all/product/for/blog',               adminProductController.getAllActiveProductForBlog);
router.get('/get/product/for/admin/panal',            ...requireAdmin, adminProductController.getAllActiveProductForAdminPanel);
router.get('/get/all/products/admin/sidebar',         ...requireAdmin, adminProductController.getAllActiveProductForSidebar);
router.get('/get/deactive/product',                    ...requireAdmin, adminProductController.getAllDeactiveProduct);
router.delete('/delete/product/:id',                   ...requireAdmin, adminProductController.deleteProduct);
router.delete('/permanent/delete/product/:id',         ...requireAdmin, adminProductController.deleteProductPermanent);
router.delete('/restore/delete/product/:id',           ...requireAdmin, adminProductController.restoreDeleteProduct);
router.get('/get/deleted/product',                     ...requireAdmin, adminProductController.getDeletedProduct);
router.patch('/delete/product/image/:id',              ...requireAdmin, adminProductController.deleteProductImage);
router.patch('/delete/product/variant-image/:id',      ...requireAdmin, adminProductController.deleteVariantImage)
router.post('/duplicate/product/:id',                  ...requireAdmin, adminProductController.dublicateProductImage);

// Product Retrieval by Name/URL
router.get('/get/product/slug/:slug',                    adminProductController.getProductBySlug);
router.get('/get/product/:productname',                adminProductController.getProductByName);
router.post('/get/product/by/url',                       adminProductController.getProductByproducturl);
router.get('/get/productmetadata/url/:producturl',       adminProductController.getProductmetadataByproducturl);

// Homepage Product Collections
router.get('/get/products/homepage',                   adminProductController.getProductsHomepage);
router.get('/get/products/customized',                 adminProductController.getProductsHomepageCustomized);
router.get('/get/latest/products/homepage',             publicCache.medium, adminProductController.getLatestProductsHomepage);
router.get('/get/products/by-ids/public',                publicCache.medium, adminProductController.getProductsByIdsPublic);
router.get('/get/Featureproducts/Homepage',             adminProductController.getFeatureProductsHomepage);
router.get('/get/refurbishedProduct/Homepage',          adminProductController.getRefurbishedProductsHomepage);
router.get('/get/tabletsAndIpads/Homepage',             adminProductController.getTabletsAndIpadsHomepage);
router.get('/get/laptopsAndMacbooks/Homepage',          adminProductController.getLaptopsAndMacbooksHomepage);

// Admin Page Product Management
router.get('/get/all/product/adminpage',                ...requireAdmin, adminProductController.getProductsAdminpage);
router.get('/get/all/newProduct/adminpage',             ...requireAdmin, adminProductController.getNewProductsAdminpage);
router.get('/get/newProduct/variantValues/:id',         ...requireAdmin, adminProductController.getVariantValuesBynewProductId)
router.get('/get/all/product/adminpage/v2',             ...requireAdmin, adminProductController.getProductsAdminpagev2);
router.get('/get/products/by/category/search',          ...requireAdmin, adminProductController.searchProductsByCategory);
router.get('/get/product-central/stats',                ...requireAdmin, adminProductController.getProductCentralStats);
router.get('/get/product/variantValues/:id',            adminProductController.getVariantValuesByProductId);
router.post('/check/stock/availability',                adminProductController.checkStockAvailability);
router.get('/get/product/for/csv',                      ...requireAdmin, adminProductController.getProductsAdminpageforcsv);

// Product Search & Filtering
router.get('/get/products/category/:categoryname',      adminProductController.getProductsByCategoryname);
router.get('/get/product/by/subcategory/:subcategoryname',adminProductController.getProductsBySubCategoryname);
router.get('/get/product/by/search/:searchname',         adminProductController.getProductsBySearch);
router.get('/get/navbar/suggestions',                    adminProductController.getNavbarSuggestions);

// ========================================================================
// PRODUCT REVIEWS MANAGEMENT
// ========================================================================
router.post('/post/product/reviews',                    productReviewsController.postProductReviews);
router.get('/reviews/:id', (req, res) => {
  // Special handler for specific review endpoint to prevent 401 errors
  res.status(200).json({ success: true, message: 'Review access granted' });
});
router.get('/get/all/product/reviews/:id',               productReviewsController.getAllProductReviews);
router.patch('/update/product/review/:id',               ...requireAdmin, productReviewsController.updateProductReviews);
router.get('/get/reviews/:id',                           productReviewsController.getReviewsbyId);
router.get('/all/products/and/reviews/details',          ...requireAdmin, productReviewsController.getProductsAndReviewsDetails);
router.delete('/delete/product/review/:id',              ...requireAdmin, productReviewsController.deleteProductReview);
router.get('/get/all/reviews',                           ...requireAdmin, productReviewsController.getAllReviews);
router.patch('/bulk/update/review/status',               ...requireAdmin, productReviewsController.bulkUpdateReviewStatus);

// ========================================================================
// PRODUCT FAQ MANAGEMENT
// ========================================================================
router.post('/post/product/faq',                          productFaqController.postProductFaq);
router.get('/get/all/product/faqs/:id',                   productFaqController.getAllProductFaqs);
router.patch('/update/product/faq/:id',                   ...requireAdmin, productFaqController.updateProductFaq);
router.get('/get/faq/:id',                                productFaqController.getFaqById);
router.delete('/delete/product/faq/:id',                  ...requireAdmin, productFaqController.deleteProductFaq);
router.post('/reorder/product/faqs',                      ...requireAdmin, productFaqController.reorderProductFaqs);
router.get('/get/all/faqs',                               ...requireAdmin, productFaqController.getAllFaqs);
router.patch('/bulk/update/faq/status',                   ...requireAdmin, productFaqController.bulkUpdateFaqStatus);

// ========================================================================
// PRODUCT RELATED PRODUCTS MANAGEMENT
// ========================================================================
router.post('/post/product/related',                      ...requireAdmin, productRelatedController.postRelatedProduct);
router.get('/get/product/related/:productId',             productRelatedController.getRelatedProducts);
router.delete('/delete/product/related/:relatedId',       ...requireAdmin, productRelatedController.deleteRelatedProduct);
router.post('/reorder/product/related',                   ...requireAdmin, productRelatedController.reorderRelatedProducts);
router.get('/get/product/related/display/:productId',     productRelatedController.getRelatedProductsForDisplay);

// ========================================================================
// ORDER MANAGEMENT
// ========================================================================
router.post('/create/order',                        ordersController.createOrder);
router.get('/get/order',                            ...requireAdmin, ordersController.getAllOrderv1);
router.get('/get/order/export',                     ...requireAdmin, ordersController.getOrdersForExport);
router.get('/get/order/cart/:id',                   ...requireAdmin, ordersController.getOrderCartById);
router.patch('/update/order/shipping/:id',          ...requireAdmin, ordersController.updateOrderShipping);
router.patch('/update/order/:id',                   ...requireAdmin, ordersController.updateOrder);
router.patch('/update/orders/bulk',                 ...requireAdmin, ordersController.bulkUpdateOrders);
router.patch('/status/order/:id',                   ...requireAdmin, ordersController.statusOrder);
router.delete('/delete/order/:id',                  ...requireAdmin, ordersController.deleteOrder);
router.delete('/restore/delete/order/:id',          ...requireAdmin, ordersController.restoreDeleteOrder);
router.delete('/permanent/delete/order/:id',        ...requireAdmin, ordersController.permanentDeleteOrder);
router.get('/get/deleted/order',                    ...requireAdmin, ordersController.getDeletedOrders)
router.get('/get/order/:id',                        requireAuth, ordersController.getOrderById);
router.get('/get/order/admin/:id',                  ...requireAdmin, ordersController.getOrderByIdAdminSide);
router.get('/get/order/number/:orderNumber',        requireAuth, ordersController.getOrderByOrderNumber);
router.post('/get/order/user',                       requireAuth, ordersController.getOrderByUser);
router.get('/get/order-numbers/user/:userId',       requireAuth, ordersController.getOrderNumbersByUserId);

// Customer-scoped routes (JWT user is source of truth)
router.get('/my/orders',                              requireAuth, ordersController.getMyOrders);
router.get('/my/orders/:orderId',                     requireAuth, ordersController.getMyOrderById);
router.get('/my/orders/by-number/:orderNumber',       requireAuth, ordersController.getMyOrderByNumber);
router.get('/my/order-numbers',                       requireAuth, ordersController.getMyOrderNumbers);

// ========================================================================
// STATIC META PAGES MANAGEMENT
// ========================================================================
router.get('/get/static-meta-pages',                staticMetaController.getAllStaticMetaPages);
router.get('/get/static-meta-page/:id',             staticMetaController.getStaticMetaPageById);
router.get('/get/static-meta-page/path/:path',      staticMetaController.getStaticMetaPageByPath);
router.post('/create/static-meta-page',             ...requireAdmin, staticMetaController.createStaticMetaPage);
router.patch('/update/static-meta-page/:id',        ...requireAdmin, staticMetaController.updateStaticMetaPage);
router.patch('/toggle-publish/static-meta-page/:id',...requireAdmin, staticMetaController.togglePublishStatus);
router.delete('/delete/static-meta-page/:id',       ...requireAdmin, staticMetaController.deleteStaticMetaPage);

// ========================================================================
// RETURN ORDER MANAGEMENT
// ========================================================================
router.post('/return/order',                         requireAuth, returnOrderController.returnOrder);
router.get('/get/return/:id',                        requireAuth, returnOrderController.getReturnOrderByID);
router.delete('/delete/return/:id',                  ...requireAdmin, returnOrderController.deleteReturnOrder);
router.patch('/update/return/:id',                   ...requireAdmin, returnOrderController.updateReturnOrder);
router.get('/getallreturn/orders',                   ...requireAdmin, returnOrderController.getAllReturnOrders);
router.patch('/returnOrder/updateStatus/:id',        ...requireAdmin, returnOrderController.updateStatus);
router.get('/get/return-orders/user/:userId',        requireAuth, returnOrderController.getReturnOrdersByUserId);
router.get('/my/returns',                            requireAuth, returnOrderController.getMyReturns);

// ========================================================================
// REQUEST ORDER MANAGEMENT
// ========================================================================
router.post('/return/ThisItem',                       requireAuth, requestOrderController.returnThisItem);
router.get('/get/request/:id',                        requireAuth, requestOrderController.getRequestOrderByID);
router.delete('/delete/request/:id',                  ...requireAdmin, requestOrderController.deleteRequestOrder);
router.get('/getallrequest/orders',                   ...requireAdmin, requestOrderController.getAllRequestOrders);
router.patch('/updatestatus/requestorder/:id',        ...requireAdmin, requestOrderController.updateStatusRequestOrder);
router.get('/user/approve/request/order/:userId',     requireAuth, requestOrderController.getApproveRequestOrder);
router.get('/user/allrequest/:userId',                requireAuth, requestOrderController.getAllRequestByUserId);
router.get('/my/return-requests',                     requireAuth, requestOrderController.getMyReturnRequests);

// ========================================================================
// RETURN ORDER OPTIONS MANAGEMENT (Dynamic Dropdowns)
// ========================================================================
router.get('/return-order-options',                    returnOrderOptionsController.getAllOptions);
router.get('/return-order-options/grouped',            returnOrderOptionsController.getAllOptionsGrouped);
router.get('/return-order-options/type/:type',         returnOrderOptionsController.getOptionsByType);
router.post('/return-order-options',                   ...requireAdmin, returnOrderOptionsController.createOption);
router.patch('/return-order-options/:id',              ...requireAdmin, returnOrderOptionsController.updateOption);
router.patch('/return-order-options/publish/:id',      ...requireAdmin, returnOrderOptionsController.togglePublish);
router.delete('/return-order-options/:id',             ...requireAdmin, returnOrderOptionsController.deleteOption);
router.post('/return-order-options/seed',              ...requireAdmin, returnOrderOptionsController.seedDefaultOptions);

// ========================================================================
// COUPON MANAGEMENT
// ========================================================================
router.post('/create/coupon',                          ...requireAdmin, couponController.createCoupon);
router.get('/get/all/coupons',                         ...requireAdmin, couponController.getAllCoupon);
router.get('/get/coupon/:id',                          ...requireAdmin, couponController.getCouponById);
router.patch('/status/coupon/:id',                     ...requireAdmin, couponController.stausCoupon);
router.patch('/update/coupon/:id',                     ...requireAdmin, couponController.updateCoupon);
router.delete('/delete/coupon/:id',                    ...requireAdmin, couponController.deleteCoupon);

// ========================================================================
// ADMIN STATISTICS & UTILITIES
// ========================================================================
router.get('/get/stats',                               ...requireAdmin, adminStatsController.getStats);
router.get('/get/stats2',                              ...requireAdmin, adminStatsController.getStats2);
router.get('/get/stats3',                              ...requireAdmin, adminStatsController.getStats3);
router.get('/get/stats4',                              ...requireAdmin, adminStatsController.getStats4);

// ========================================================================
// ADMIN MARKETING ANALYTICS OVERVIEW
// ========================================================================
const analyticsAdSpendController = require('../controller/analyticsAdSpendController');
const analyticsOverviewController = require('../controller/analyticsOverviewController');
const analyticsVisitorSessionController = require('../controller/analyticsVisitorSessionController');
router.get('/analytics/overview', ...requireAdmin, analyticsOverviewController.getOverview);
router.post('/analytics/ad-spend', ...requireAdmin, analyticsAdSpendController.upsert);
router.post('/analytics/visitor-session', analyticsVisitorSessionController.record);
router.get('/get/order/stats',                         ...requireAdmin, adminStatsController.getOrderStats);
router.get('/get/files',                               ...requireAdmin, adminStatsController.getFiles);
router.get('/get/files/spaces',                        ...requireAdmin, adminStatsController.getFilesSpaces);
router.post('/upload/file',                            ...requireAdmin, adminStatsController.uploadFile);
router.post('/upload/file/spaces',                     ...requireAdmin, adminStatsController.uploadFileSpaces);
router.patch('/update/file',                           ...requireAdmin, adminStatsController.renameFile);
router.patch('/update/file/spaces',                    ...requireAdmin, adminStatsController.updateFileSpaces);
router.delete('/delete/file',                          ...requireAdmin, adminStatsController.deleteFile);
router.delete('/delete/file/spaces',                   ...requireAdmin, adminStatsController.deleteSpacesFile);
router.get('/top/product/sold',                        ...requireAdmin, adminStatsController.getTopProductSold);

// Public contact form (legacy fixed fields — uses shared SMTP)
router.post('/public/contact',                        publicContactController.submitContactForm);

// ========================================================================
// CONTACT US WIDGET (singleton CMS + public submit)
// ========================================================================
router.get('/contact-us-widget/public',               contactUsWidgetController.getPublic);
router.get('/contact-us-widget',                      ...requireAdmin, contactUsWidgetController.getAdmin);
router.post('/contact-us-widget',                    ...requireAdmin, contactUsWidgetController.saveAdmin);
router.post('/contact-us-widget/submit',             contactUsWidgetController.submit);

// Newsletter Management
router.post('/newsletter/subscribers',                 adminStatsController.NewsletterSubscribers);
router.post('/blackfridaymodal',                       adminStatsController.blackfridaymodal);
router.get('/get/newsletters',                         ...requireAdmin, adminStatsController.getNewsletters);

// CSV Upload & Bulk Operations
router.post('/upload/csv',                             ...requireAdmin, adminStatsController.uploadCSV);
router.post('/upload/csv/all-products',                ...requireAdmin, adminStatsController.uploadCSVAllProducts);
router.post('/upload/csv/with/accessories',            ...requireAdmin, adminStatsController.uploadCSVWithAccessories);
router.get('/uploads/feed/:filename',                  ...requireAdmin, adminStatsController.downloadFeedCsv);

// Sitemap Generation
router.get('/sitemap.xml', resolveStoreByDomain, storefrontSitemapController.sitemapXml);
router.get('/sitemap-images.xml', resolveStoreByDomain, storefrontSitemapController.sitemapImagesXml);
router.post('/create/sitemap',                         ...requireAdmin, siteMapController.createSitemap);
router.post('/create/sitemap/optimized',               ...requireAdmin, optimizedSitemapController.createSitemapOptimized);

// ========================================================================
// MESSAGE/CHAT SYSTEM
// ========================================================================
router.post('/send/messages/senderid/:receiver',       ...requireAdmin, messageController.sendMessagesFromAdmin);
router.post('/send/messageFromUser/senderid/:senderId',requireAuth, messageController.sendMessage);
router.get('/get/messages/senderid/:receiver',           ...requireAdmin, messageController.getMessages);
router.get('/get/users/whosend/messages',              ...requireAdmin, messageController.getUsersWhoSendMessage);
router.delete('/delete/message/:messageId',            ...requireAdmin, messageController.deleteMessage);
router.delete('/delete/allmessage/ofThisUser/:userId', ...requireAdmin, messageController.deleteAllMessageOfThisUser);
router.put('/update/message/:messageId',               ...requireAdmin, messageController.updateMessage);
router.get('/get/total/messages/count',                ...requireAdmin, messageController.getTotalMessagesCount);
router.get('/get/conversations/:userId',               requireAuth, messageController.getConversations);
router.get('/admin/conversations/:userId',             ...requireAdmin, messageController.getConversationsForAdmin);
router.get('/messages/all-conversations',              ...requireAdmin, messageController.getAllConversations);
router.post('/messages/orders/unread-counts',          requireAuth, messageController.getUnreadCountsForOrders);
router.get('/get/messages/:userId/:orderId',           requireAuth, messageController.getMessagesByConversation);
router.post('/send/email-notification/:userId',        ...requireAdmin, messageController.sendEmailNotificationToUser);
router.patch('/toggle/message/read-status/:userId/:orderId', ...requireAdmin, messageController.toggleLastMessageReadStatus);
router.post('/assign/general-chat-to-order/:userId/:orderId', ...requireAdmin, messageController.assignGeneralChatToOrder);

// CONVERSATION TAGS
router.get('/conversation/tags/predefined/all',                  ...requireAdmin, messageController.getAllPredefinedTags);
router.post('/conversation/tags/:userId/:conversationId',        ...requireAdmin, messageController.addTagToConversation);
router.delete('/conversation/tags/:userId/:conversationId/:tagName', ...requireAdmin, messageController.removeTagFromConversation);
router.get('/conversation/tags/:userId/:conversationId',         requireAuth, messageController.getConversationTags);

// Customer-scoped messaging (JWT user is source of truth)
router.get('/my/conversations',                                  requireAuth, messageController.getMyConversations);
router.get('/my/conversations/:orderId/messages',                requireAuth, messageController.getMyMessagesByConversation);
router.post('/my/messages',                                      requireAuth, messageController.sendMyMessage);
router.get('/my/conversations/:conversationId/tags',               requireAuth, messageController.getMyConversationTags);

// PRELOADED MESSAGES (Quick Reply Templates)
router.get('/preloaded-messages',                                ...requireAdmin, preloadedMessageController.getAllPreloadedMessages);
router.get('/preloaded-messages/active',                         ...requireAdmin, preloadedMessageController.getActivePreloadedMessages);
router.get('/preloaded-messages/:id',                            ...requireAdmin, preloadedMessageController.getPreloadedMessageById);
router.post('/preloaded-messages',                               ...requireAdmin, preloadedMessageController.createPreloadedMessage);
router.patch('/preloaded-messages/:id',                          ...requireAdmin, preloadedMessageController.updatePreloadedMessage);
router.patch('/preloaded-messages/toggle/:id',                   ...requireAdmin, preloadedMessageController.togglePreloadedMessageStatus);
router.delete('/preloaded-messages/:id',                         ...requireAdmin, preloadedMessageController.deletePreloadedMessage);

// AI MESSAGE IMPROVEMENT (OpenAI)
router.post('/ai/improve-message',                               ...requireAdmin, aiMessageController.improveMessage);

// ========================================================================
// VISITOR MESSAGES (Chat Widget)
// ========================================================================
// Admin panel routes
router.get('/visitor-messages',                                  ...requireAdmin, visitorMessageController.getAllVisitors);
router.get('/visitor-messages/unread-count',                     ...requireAdmin, visitorMessageController.getUnreadCount);
router.get('/visitor-messages/auto-reply/settings',              ...requireAdmin, visitorMessageController.getAutoReplySettings);
router.post('/visitor-messages/auto-reply/settings',             ...requireAdmin, visitorMessageController.saveAutoReplySettings);
router.patch('/visitor-messages/auto-reply/toggle',              ...requireAdmin, visitorMessageController.toggleAutoReply);
router.get('/visitor-messages/away/settings',                    ...requireAdmin, visitorMessageController.getAwayStatus);
router.post('/visitor-messages/away/settings',                   ...requireAdmin, visitorMessageController.saveAwayStatus);
router.patch('/visitor-messages/away/toggle',                    ...requireAdmin, visitorMessageController.toggleAwayStatus);
router.get('/visitor-messages/chat-enabled/public',              visitorMessageController.getChatEnabledPublic);
router.get('/visitor-messages/chat-enabled/settings',            ...requireAdmin, visitorMessageController.getChatEnabledSettings);
router.post('/visitor-messages/chat-enabled/settings',           ...requireAdmin, visitorMessageController.saveChatEnabledSettings);
router.patch('/visitor-messages/chat-enabled/toggle',            ...requireAdmin, visitorMessageController.toggleChatEnabled);
router.get('/visitor-messages/check-user/:email',                ...requireAdmin, visitorMessageController.checkUserByEmail);
router.get('/visitor-messages/session/:sessionId',               visitorMessageController.getConversationBySession);
router.post('/visitor-messages/create',                          visitorMessageController.createConversation);
router.get('/visitor-messages/:id',                              ...requireAdmin, visitorMessageController.getMessagesByVisitorId);
router.put('/visitor-messages/:id/read',                         ...requireAdmin, visitorMessageController.markAsRead);
router.put('/visitor-messages/:id/unread',                       ...requireAdmin, visitorMessageController.markAsUnread);
router.post('/visitor-messages/:id/reply',                       ...requireAdmin, visitorMessageController.uploadMiddleware, visitorMessageController.sendReply);
router.delete('/visitor-messages/:id',                           ...requireAdmin, visitorMessageController.deleteConversation);
router.post('/visitor-messages/:id/message',                     visitorMessageController.uploadMiddleware, visitorMessageController.addMessage);
router.post('/visitor-messages/:id/transfer',                    ...requireAdmin, visitorMessageController.transferToMessages);

// ========================================================================
// ROLE AND PERMISSIONS MANAGEMENT
// ========================================================================
router.post('/create/role',                           ...requireSuperadmin, roleAndPermissons.createRole);
router.get('/get/role/:id',                           ...requireAdmin, roleAndPermissons.getRoleByID);
router.patch('/update/role/:id',                      ...requireSuperadmin, roleAndPermissons.updateRole);
router.delete('/delete/role/:id',                     ...requireSuperadmin, roleAndPermissons.deleteRole);
router.get('/get/all/roles',                          ...requireAdmin, roleAndPermissons.getAllRole);
router.get('/get/users/by-role/:roleId',              ...requireAdmin, roleAndPermissons.getUsersByRole);
router.post('/implement/permission/on/role',          ...requireSuperadmin, roleAndPermissons.implementPermissionOnRole);

// ========================================================================
// PDF LABELS MANAGEMENT
// ========================================================================
router.post('/upload/labels',                         ...requireAdmin, labelController.uploadLabels);
router.get('/get/labels',                             ...requireAdmin, labelController.getAllLabels);
router.get('/get/label/:id',                          ...requireAdmin, labelController.getLabelById);
router.patch('/update/label/:id',                     ...requireAdmin, labelController.updateLabel);
router.delete('/delete/label/:id',                    ...requireAdmin, labelController.deleteLabel);
router.get('/view/label/:id',                         ...requireAdmin, labelController.viewLabel);
router.get('/get/one/unused/label',                   ...requireAdmin, labelController.getOneUnusedLabel);
router.get('/order/:id/label',                        ...requireAdmin, labelController.getLabelOfOrder);
router.post('/assign/label/to/order',                 ...requireAdmin, labelController.assignLabelToOrder);
router.get('/return-order/:id/label',                 ...requireAdmin, labelController.getLabelOfReturnOrder);
router.post('/assign/label/to/return-order',          ...requireAdmin, labelController.assignLabelToReturnOrder);
// ========================================================================
// NEW BLOG SYSTEM (Advanced Blogging Platform)
// ========================================================================
router.post('/newblog/blog/posts', ...requireAdmin, handleBlogUpload, createBlogPost);
router.get('/newblog/get/all/blog/posts', getAllBlogPosts);
router.get('/newblog/blog/posts/:id', ...requireAdmin, getBlogPostById);
router.put('/newblog/blog/posts/:id', ...requireAdmin, handleBlogUpload, updateBlogPost);
router.delete('/newblog/blog/posts/:id', ...requireAdmin, deleteBlogPost);
router.get('/newblog/blog/postsBySlug/:slug', getBlogPostBySlug);
router.get('/newblog/blog/postsBySlugWithoutCache/:slug', getBlogPostBySlugWithoutCache);
router.post('/newblog/blog/profile-sync', ...requireAdmin, syncBlogPersonProfile);

router.get('/newblog/blog/categories', getAllCategories);
router.get('/newblog/blog/categories/:id', ...requireAdmin, getCategoryById);
router.post('/newblog/blog/categories', ...requireAdmin, createCategory);
router.put('/newblog/blog/categories/:id', ...requireAdmin, updateCategory);
router.delete('/newblog/blog/categories/:id', ...requireAdmin, deleteCategory);
router.get('/newblog/blog/category-stats', ...requireAdmin, getCategoryStats);

// ========================================================================
// FOOTER PAGES MANAGEMENT
// ========================================================================
router.get('/footer-pages/get/all/pages', getAllFooterPages);
router.get('/footer-pages/pagesBySlug/:slug', getFooterPageBySlug);
router.post('/footer-pages/pages', ...requireAdmin, handleFooterPageUpload, createFooterPage);
router.get('/footer-pages/pages/:id', ...requireAdmin, getFooterPageById);
router.put('/footer-pages/pages/:id', ...requireAdmin, handleFooterPageUpload, updateFooterPage);
router.delete('/footer-pages/pages/:id', ...requireAdmin, deleteFooterPage);

// ========================================================================
// PAGE CATEGORIES (footer / static pages grouping)
// ========================================================================
router.get('/page-categories', getAllPageCategories);
router.post('/page-categories', ...requireAdmin, createPageCategory);
router.put('/page-categories/:id', ...requireAdmin, updatePageCategory);
router.delete('/page-categories/:id', ...requireAdmin, deletePageCategory);

// ========================================================================
// DEALS & DISCOUNTS MANAGEMENT
// ========================================================================
router.post('/create/deal', ...requireAdmin, dealsController.createDeal);
router.get('/get/all/deals', ...requireAdmin, dealsController.getAllDeals);
router.get('/get/active/deals', publicCache.medium, dealsController.getActiveDeals);
router.get('/get/deal/:id', ...requireAdmin, dealsController.getDealById);
router.put('/update/deal/:id', ...requireAdmin, dealsController.updateDeal);
router.patch('/expire/deal/:id', ...requireAdmin, dealsController.markExpired);
router.delete('/delete/deal/:id', ...requireAdmin, dealsController.deleteDeal);

// ========================================================================
// FOOTER SETTINGS MANAGEMENT
// ========================================================================
router.get('/footer/settings/public', publicCache.long, footerSettingsController.getFooterSettingsPublic);
router.get('/footer/settings', ...requireAdmin, footerSettingsController.getFooterSettings);
router.post('/footer/settings', ...requireAdmin, footerSettingsController.saveFooterSettings);
router.patch('/footer/settings/:section', ...requireAdmin, footerSettingsController.updateFooterSection);
router.post('/footer/upload-image', ...requireAdmin, footerSettingsController.handleFooterImageUpload, footerSettingsController.uploadFooterImage);

// ========================================================================
// HOMEPAGE DATA MANAGEMENT
// ========================================================================
// SEO-only (same fields as new blog: metaTitle, metaDescription, metaTags = keywords, metaSchema)
router.get('/homepage-data/public/seo', publicCache.long, homepageDataController.getHomepagePublicSeo);
router.get('/homepage-data/seo', ...requireAdmin, homepageDataController.getHomepageSeo);
router.patch('/homepage-data/seo', ...requireAdmin, homepageDataController.patchHomepageSeo);
router.get('/homepage-data', ...requireAdmin, homepageDataController.getHomepageData);
router.get('/homepage-data/public', publicCache.long, homepageDataController.getHomepageData);
router.post('/homepage-data', ...requireAdmin, homepageDataController.handleHomepageDataSave, homepageDataController.saveHomepageData);
router.post('/homepage-data/upload-image', ...requireAdmin, homepageDataController.handleHomepageImageUpload, homepageDataController.uploadHomepageImage);

router.get('/homepage-nav-links/public', publicCache.long, homepageNavLinksController.getHomepageNavLinksPublic);
router.put('/homepage-nav-links', ...requireAdmin, homepageNavLinksController.putHomepageNavLinks);

// ========================================================================
// BANNER TEXT MANAGEMENT (Feature Text After Banner)
// ========================================================================
const bannerTextController = require('../controller/bannerTextController');
router.get('/banner-text', ...requireAdmin, bannerTextController.getBannerText);
router.get('/banner-text/public', bannerTextController.getBannerTextPublic);
router.post('/banner-text', ...requireAdmin, bannerTextController.saveBannerText);

// ========================================================================
// BANNER MANAGEMENT (Hero Banners)
// ========================================================================
const bannerRoutes = require('./bannerRoutes');
router.use('/', bannerRoutes); // Mount at root since routes already include full paths

// ========================================================================
// GOOGLE SEARCH CONSOLE VERIFICATION
// ========================================================================
const googleSearchConsoleController = require('../controller/googleSearchConsoleController');
router.get('/get/google-search-console-verification', ...requireAdmin, googleSearchConsoleController.getVerificationCode);
router.post('/update/google-search-console-verification', ...requireAdmin, googleSearchConsoleController.updateVerificationCode);
router.delete('/delete/google-search-console-verification', ...requireAdmin, googleSearchConsoleController.deleteVerificationCode);

// ========================================================================
// HOMEPAGE FEATURES MANAGEMENT
// ========================================================================
const homepageFeatureController = require('../controller/homepageFeatureController');
const { handleHomepageFeatureUpload } = require('../controller/homepageFeatureController');
// Public: active features only (must be before /get/homepage-features)
router.get('/get/homepage-features/active', publicCache.long, homepageFeatureController.getHomepageFeaturesActive);
// Admin
router.get('/get/homepage-features', ...requireAdmin, homepageFeatureController.getHomepageFeatures);
router.post('/create/homepage-feature', ...requireAdmin, handleHomepageFeatureUpload, homepageFeatureController.createHomepageFeature);
router.put('/update/homepage-feature/:id', ...requireAdmin, handleHomepageFeatureUpload, homepageFeatureController.updateHomepageFeature);
router.delete('/delete/homepage-feature/:id', ...requireAdmin, homepageFeatureController.deleteHomepageFeature);
router.delete('/delete/homepage-feature-image/:id', ...requireAdmin, homepageFeatureController.deleteHomepageFeatureImage);
router.patch('/toggle/homepage-feature/:id', ...requireAdmin, homepageFeatureController.toggleHomepageFeature);
router.post('/reorder/homepage-features', ...requireAdmin, homepageFeatureController.reorderHomepageFeatures);

// ========================================================================
// HOMEPAGE SLIDER WIDGET (singleton)
// ========================================================================
const homepageSliderWidgetController = require('../controller/homepageSliderWidgetController');
const { handleHomepageSliderWidgetUpload } = homepageSliderWidgetController;
router.get(
  '/homepage-slider-widget/public',
  homepageSliderWidgetController.getHomepageSliderWidgetPublic
);
router.get(
  '/homepage-slider-widget',
  ...requireAdmin,
  homepageSliderWidgetController.getHomepageSliderWidget
);
router.post(
  '/homepage-slider-widget',
  ...requireAdmin,
  handleHomepageSliderWidgetUpload,
  homepageSliderWidgetController.saveHomepageSliderWidget
);

// ========================================================================
// HOMEPAGE NEWSLETTER WIDGET (singleton)
// ========================================================================
const homepageNewsletterWidgetController = require('../controller/homepageNewsletterWidgetController');
const { handleHomepageNewsletterWidgetUpload } = homepageNewsletterWidgetController;
router.get(
  '/homepage-newsletter-widget/public',
  publicCache.long,
  homepageNewsletterWidgetController.getHomepageNewsletterWidgetPublic
);
router.get(
  '/homepage-newsletter-widget',
  ...requireAdmin,
  homepageNewsletterWidgetController.getHomepageNewsletterWidget
);
router.post(
  '/homepage-newsletter-widget',
  ...requireAdmin,
  handleHomepageNewsletterWidgetUpload,
  homepageNewsletterWidgetController.saveHomepageNewsletterWidget
);

// ========================================================================
// SITE WIDGET VISIBILITY (global enable/disable per widget type)
// ========================================================================
const siteWidgetSettingsController = require('../controller/siteWidgetSettingsController');
router.get('/site-widget-settings/public', publicCache.long, siteWidgetSettingsController.getSiteWidgetSettingsPublic);
router.get(
  '/site-widget-settings',
  ...requireAdmin,
  siteWidgetSettingsController.getSiteWidgetSettingsAdmin
);
router.put(
  '/site-widget-settings',
  ...requireAdmin,
  siteWidgetSettingsController.putSiteWidgetSettings
);

// ========================================================================
// DEALS MODAL (Hot UK Deals / Black Friday modal — singleton CMS)
// ========================================================================
const dealsModalController = require('../controller/dealsModalController');
const { handleDealsModalUpload } = dealsModalController;
router.get('/deals-modal/public', dealsModalController.getDealsModalPublic);
router.get('/deals-modal', ...requireAdmin, dealsModalController.getDealsModalAdmin);
router.post(
  '/deals-modal',
  ...requireAdmin,
  handleDealsModalUpload,
  dealsModalController.saveDealsModal
);

// ========================================================================
// ANNOUNCEMENT BANNER (top strip — singleton CMS)
// ========================================================================
const announcementBannerController = require('../controller/announcementBannerController');
router.get(
  '/announcement-banner/public',
  announcementBannerController.getAnnouncementBannerPublic
);
router.get(
  '/announcement-banner',
  ...requireAdmin,
  announcementBannerController.getAnnouncementBannerAdmin
);
router.put(
  '/announcement-banner',
  ...requireAdmin,
  announcementBannerController.putAnnouncementBanner
);

// ========================================================================
// NAVBAR HEADER (Need help? phone — singleton, editable from navbar order admin)
// ========================================================================
const navbarHeaderController = require('../controller/navbarHeaderController');
const navbarVariantTestController = require('../controller/navbarVariantTestController');
router.get('/navbar-header/public', publicCache.long, navbarHeaderController.getNavbarHeaderPublic);
router.get('/navbar-header', ...requireAdmin, navbarHeaderController.getNavbarHeaderAdmin);
router.post('/navbar-header', ...requireAdmin, navbarHeaderController.saveNavbarHeader);
router.get('/navbar-variant-test/public', publicCache.long, navbarVariantTestController.getNavbarVariantTestPublic);
router.get('/navbar-variant-test', ...requireAdmin, navbarVariantTestController.getNavbarVariantTestAdmin);
router.put('/navbar-variant-test', ...requireAdmin, navbarVariantTestController.putNavbarVariantTest);

// ========================================================================
// CATEGORY CARDS MANAGEMENT
// ========================================================================
const categoryCardController = require('../controller/categoryCardController');
const { handleCategoryCardUpload } = require('../controller/categoryCardController');
router.get('/get/category-cards/active', publicCache.long, categoryCardController.getCategoryCardsActive);
router.get('/get/category-cards/section-settings', publicCache.long, categoryCardController.getCategoryCardsSectionSettings);
router.put('/category-cards/section-settings', ...requireAdmin, categoryCardController.updateCategoryCardsSectionSettings);
router.get('/get/category-cards', ...requireAdmin, categoryCardController.getCategoryCards);
router.post('/create/category-card', ...requireAdmin, handleCategoryCardUpload, categoryCardController.createCategoryCard);
router.put('/update/category-card/:id', ...requireAdmin, handleCategoryCardUpload, categoryCardController.updateCategoryCard);
router.delete('/delete/category-card/:id', ...requireAdmin, categoryCardController.deleteCategoryCard);
router.delete('/delete/category-card-image/:id', ...requireAdmin, categoryCardController.deleteCategoryCardImage);
router.patch('/toggle/category-card/:id', ...requireAdmin, categoryCardController.toggleCategoryCard);
router.post('/reorder/category-cards', ...requireAdmin, categoryCardController.reorderCategoryCards);

// ========================================================================
// PROMOTIONAL SECTIONS MANAGEMENT (Buy Now Pay Later, Sell/Buy Cards, Tiny Phone Banner)
// ========================================================================
const promotionalSectionsController = require('../controller/promotionalSectionsController');
const {
    handleBuyNowPayLaterUpload,
    handleSellBuyCardsUpload,
    handleTinyPhoneBannerUpload
} = require('../controller/promotionalSectionsController');
// Public /active endpoints (must be before admin GET so path matches correctly)
router.get('/get/buy-now-pay-later/active', publicCache.long, promotionalSectionsController.getBuyNowPayLaterActive);
router.get('/get/sell-buy-cards/active', publicCache.long, promotionalSectionsController.getSellBuyCardsActive);
router.get('/get/tiny-phone-banner/active', publicCache.long, promotionalSectionsController.getTinyPhoneBannerActive);
// Admin GET
router.get('/get/buy-now-pay-later', ...requireAdmin, promotionalSectionsController.getBuyNowPayLater);
router.get('/get/sell-buy-cards', ...requireAdmin, promotionalSectionsController.getSellBuyCards);
router.get('/get/tiny-phone-banner', ...requireAdmin, promotionalSectionsController.getTinyPhoneBanner);
// Admin POST update (create if not exists)
router.post('/update/buy-now-pay-later', ...requireAdmin, handleBuyNowPayLaterUpload, promotionalSectionsController.updateBuyNowPayLater);
router.post('/update/sell-buy-cards', ...requireAdmin, handleSellBuyCardsUpload, promotionalSectionsController.updateSellBuyCards);
router.post('/update/tiny-phone-banner', ...requireAdmin, handleTinyPhoneBannerUpload, promotionalSectionsController.updateTinyPhoneBanner);
// Admin DELETE image from promotional section
router.delete('/delete/promotional-image', ...requireAdmin, promotionalSectionsController.deletePromotionalImage);

// ========================================================================
// LOGO MANAGEMENT
// ========================================================================
const logoController = require('../controller/logoController');
const { handleLogoUpload, handleFaviconUpload } = require('../controller/logoController');
router.get('/get/logo', ...requireAdmin, logoController.getLogo);
router.get('/get/logo/public', publicCache.long, logoController.getLogoPublic);
/** Alias for storefront / admin tools expecting this path (same JSON as get/logo/public). */
router.get('/admin/logo', publicCache.long, logoController.getLogoPublic);
router.get('/api/admin/logo', publicCache.long, logoController.getLogoPublic);
router.post('/update/logo', ...requireAdmin, handleLogoUpload, logoController.updateLogo);
router.delete('/delete/logo', ...requireAdmin, logoController.deleteLogo);
router.post('/update/favicon', ...requireAdmin, handleFaviconUpload, logoController.updateFavicon);
router.delete('/delete/favicon', ...requireAdmin, logoController.deleteFavicon);

// ========================================================================
// SITE-WIDE THEME (brand greens → CSS variables on storefront)
// ========================================================================
const siteThemeController = require('../controller/siteThemeController');
router.get('/site-theme', ...requireAdmin, siteThemeController.getThemeAdmin);
router.get('/site-theme/public', siteThemeController.getThemePublic);
router.post('/site-theme', ...requireAdmin, siteThemeController.saveTheme);
// CMS typography (Next.js + admin)
router.get('/api/theme', siteThemeController.getTypographyPublic);
router.put('/api/theme', ...requireAdmin, siteThemeController.updateTypography);
router.put('/api/theme/body-background', ...requireAdmin, siteThemeController.updateBodyBackground);
router.put('/api/theme/tag-colors', ...requireAdmin, siteThemeController.updateTagColors);
router.put('/api/theme/booking-ui', ...requireAdmin, siteThemeController.updateBookingUi);

// ========================================================================
// TRUSTPILOT SETTINGS MANAGEMENT
// ========================================================================
const trustpilotController = require('../controller/trustpilotController');
router.get('/trustpilot', ...requireAdmin, trustpilotController.getTrustpilotSettings);
router.get('/trustpilot/public', publicCache.long, trustpilotController.getTrustpilotSettingsPublic);
router.post('/trustpilot', ...requireAdmin, trustpilotController.saveTrustpilotSettings);

// ========================================================================
// SITE SCRIPTS (Semrush, Ahrefs, GSC, custom head/body)
// ========================================================================
const siteScriptsController = require('../controller/siteScriptsController');
router.get('/site-scripts', ...requireAdmin, siteScriptsController.getSiteScriptsSettings);
router.get('/site-scripts/public', siteScriptsController.getSiteScriptsSettingsPublic);
router.post('/site-scripts', ...requireAdmin, siteScriptsController.saveSiteScriptsSettings);

// ========================================================================
// ROBOTS.TXT SETTINGS (singleton)
// ========================================================================
router.get('/robots-settings/public', robotsSettingsController.getRobotsSettingsPublic);
router.get('/robots-settings', ...requireAdmin, robotsSettingsController.getRobotsSettingsAdmin);
router.post('/robots-settings', ...requireAdmin, robotsSettingsController.saveRobotsSettings);

// ========================================================================
// SITE-WIDE SCHEMA (JSON-LD structured data on every page)
// ========================================================================
const siteWideSchemaController = require('../controller/siteWideSchemaController');
router.get('/site-wide-schema', ...requireAdmin, siteWideSchemaController.getSiteWideSchema);
router.get('/site-wide-schema/public', siteWideSchemaController.getSiteWideSchemaPublic);
router.post('/site-wide-schema', ...requireAdmin, siteWideSchemaController.saveSiteWideSchema);

// ========================================================================
// NEWSLETTER EMAIL TEMPLATES (admin-editable copy only)
// ========================================================================
const newsletterEmailTemplatesController = require('../controller/newsletterEmailTemplatesController');
router.get(
  '/newsletter-email-templates',
  ...requireAdmin,
  newsletterEmailTemplatesController.getAdmin
);
router.put(
  '/newsletter-email-templates',
  ...requireAdmin,
  newsletterEmailTemplatesController.saveAdmin
);

// ========================================================================
// ORDER EMAIL TEMPLATES (admin-editable static copy only)
// ========================================================================
const orderEmailTemplatesController = require('../controller/orderEmailTemplatesController');
router.get('/order-email-templates', ...requireAdmin, orderEmailTemplatesController.getAdmin);
router.put('/order-email-templates', ...requireAdmin, orderEmailTemplatesController.saveAdmin);

// ========================================================================
// EMAIL BRANDING (admin preview — matches transactional `getEmailBranding`)
// ========================================================================
const emailBrandingPreviewController = require('../controller/emailBrandingPreviewController');
router.get(
  '/email-branding/preview',
  ...requireAdmin,
  emailBrandingPreviewController.getEmailBrandingForPreview
);

// ========================================================================
// BOOKING ROUTES (Phase 1 — settings, packages, availability)
// ========================================================================
const bookingSettingsController = require('../controller/bookingSettingsController');
const bookingPackageController = require('../controller/bookingPackageController');
const bookingAvailabilityController = require('../controller/bookingAvailabilityController');
const bookingBlockedDateController = require('../controller/bookingBlockedDateController');

router.get('/booking/settings/public', bookingSettingsController.getPublicSettings);
router.get('/booking/settings/public/seo', publicCache.long, bookingSettingsController.getPublicSeo);
router.get('/booking/settings/public/content', publicCache.long, bookingSettingsController.getPublicContent);
router.get('/get/booking/packages', bookingPackageController.getPublicPackages);
router.get('/get/booking/package/:id', bookingPackageController.getPackageById);

router.get('/booking/settings', ...requireAdmin, bookingSettingsController.getAdminSettings);
router.get('/booking/settings/seo', ...requireAdmin, bookingSettingsController.getAdminSeo);
router.get('/booking/settings/content', ...requireAdmin, bookingSettingsController.getAdminContent);
router.patch('/booking/settings', ...requireAdmin, bookingSettingsController.updateSettings);
router.patch('/booking/settings/seo', ...requireAdmin, bookingSettingsController.patchSeo);
router.patch('/booking/settings/content', ...requireAdmin, bookingSettingsController.patchPageContent);

router.post('/create/booking/package', ...requireAdmin, bookingPackageController.createPackage);
router.post(
  '/booking/upload-package-image',
  ...requireAdmin,
  bookingPackageController.handlePackageImageUpload,
  bookingPackageController.uploadPackageImage
);
router.get('/get/booking/packages/admin', ...requireAdmin, bookingPackageController.getAdminPackages);
router.patch('/update/booking/package/:id', ...requireAdmin, bookingPackageController.updatePackage);
router.delete('/delete/booking/package/:id', ...requireAdmin, bookingPackageController.deletePackage);

router.post(
  '/create/booking/availability',
  ...requireAdmin,
  bookingAvailabilityController.createAvailability
);
router.get('/get/booking/availability', ...requireAdmin, bookingAvailabilityController.getAvailability);
router.patch(
  '/update/booking/availability/:id',
  ...requireAdmin,
  bookingAvailabilityController.updateAvailability
);
router.delete(
  '/delete/booking/availability/:id',
  ...requireAdmin,
  bookingAvailabilityController.deleteAvailability
);

router.post(
  '/create/booking/blocked-date',
  ...requireAdmin,
  bookingBlockedDateController.createBlockedDate
);
router.get('/get/booking/blocked-dates', ...requireAdmin, bookingBlockedDateController.getBlockedDates);
router.delete(
  '/delete/booking/blocked-date/:id',
  ...requireAdmin,
  bookingBlockedDateController.deleteBlockedDate
);

// ========================================================================
// BOOKING ROUTES (Phase 2 + 3 — slots, holds, bookings)
// ========================================================================
const bookingController = require('../controller/bookingController');
const bookingPaymentController = require('../controller/bookingPaymentController');

// Admin routes first (specific routes before parameterized routes)
router.get('/get/booking/admin', ...requireAdmin, bookingController.getAdminBookings);
router.get('/get/booking/admin/slots', ...requireAdmin, bookingController.getAdminSlotsForDate);
router.get('/get/booking/admin/:id', ...requireAdmin, bookingController.getAdminBookingById);
router.post('/create/booking/admin', ...requireAdmin, bookingController.createAdminBooking);
router.patch('/status/booking/:id', ...requireAdmin, bookingController.updateBookingStatus);
router.patch('/payment-status/booking/:id', ...requireAdmin, bookingController.updatePaymentStatus);
router.post('/cancel/booking/:id', ...requireAdmin, bookingController.cancelBooking);
router.post('/reschedule/booking/:id', ...requireAdmin, bookingController.rescheduleBooking);

// Public routes
router.get('/get/booking/slots', bookingController.getAvailableSlots);
router.post('/create/booking/hold', bookingController.createSlotHold);
router.post('/verify/booking/holds', bookingController.verifySlotHolds);
router.post('/release/booking/hold', bookingController.releaseSlotHold);
router.post('/create/booking', bookingController.createBooking);
router.post('/get/booking/user', requireAuth, bookingController.getUserBookings);
router.get('/my/bookings', requireAuth, bookingController.getMyBookings);
router.post('/create/booking/payment-intent', bookingPaymentController.createBookingPaymentIntent);
router.get('/get/booking/:bookingNumber', bookingController.getBookingByNumber);

// ========================================================================
// AUDIT LOGS (admin — performance timing + error/event trail)
// ========================================================================
router.get('/audit-logs/slowest', ...requireAdmin, auditLogController.getSlowestRoutes);
router.get('/audit-logs', ...requireAdmin, auditLogController.getAuditLogs);

// ========================================================================
// CRON JOB ROUTES
// ========================================================================
router.use('/cron', cronRoutes);

// ========================================================================
// EXPORT ROUTER
// ========================================================================
module.exports = router;