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
const categoryDisplayProductsController = require('../controller/categoryDisplayProductsController');
const footerSettingsController = require('../controller/footerSettingsController');
const stripeSettingsController = require('../controller/stripeSettingsController');
const shippingSettingsController = require('../controller/shippingSettingsController');
const homepageDataController = require('../controller/homepageDataController');
const homepageNavLinksController = require('../controller/homepageNavLinksController');

// ========================================================================
// NEW BLOG SYSTEM CONTROLLERS
// ========================================================================
const { createBlogPost, updateBlogPost, getBlogPostById, getAllBlogPosts, deleteBlogPost, handleBlogUpload, getBlogPostBySlug, getBlogPostBySlugWithoutCache } = require('../controller/newblog/BlogController');
const { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory, getCategoryStats } = require('../controller/newblog/BlogCategoryController');

// ========================================================================
// FOOTER PAGES CONTROLLERS
// ========================================================================
const { createFooterPage, updateFooterPage, getFooterPageById, getFooterPageBySlug, getAllFooterPages, deleteFooterPage, handleFooterPageUpload } = require('../controller/footerPageController');

// ========================================================================
// MIDDLEWARE & OTHER IMPORTS
// ========================================================================
const roleAndPermissons = require('../controller/roleAndPermissons');
const requireAdmin = require('../../middleware/requireAdmin');
const cronRoutes = require('./cronRoutes');
const order = require('../models/order');

// ========================================================================
// PAYMENT ROUTES (Stripe & PayPal)
// ========================================================================
router.get('/config',                           paymentsController.config);
router.post('/create-payment-intent',           paymentsController.createPaymentIntent);
router.post('/update-payment-intent-metadata',  paymentsController.updatePaymentIntentMetadata);
router.post('/update-payment-intent-amount',    paymentsController.updatePaymentIntentAmount);
router.post('/retrieve-payment-details',        paymentsController.retrievePaymentDetails);
router.post('/retrieve-payment-details-session',paymentsController.retrievePaymentDetailsSession);
router.post("/create-checkout-session",         paymentsController.createCheckoutSession);
router.post('/payment',                         paymentsController.verifyPaymentPaypal);
router.get('/success',                          paymentsController.successPaymentPaypal);
// router.get('/failed', paymentsController.failedPaymentPaypal);

// ========================================================================
// STRIPE SETTINGS MANAGEMENT
// ========================================================================
router.get('/stripe/settings',                  requireAdmin, stripeSettingsController.getSettings);
router.post('/stripe/settings',                 requireAdmin, stripeSettingsController.saveSettings);
router.post('/stripe/test-connection',          requireAdmin, stripeSettingsController.testConnection);

// ========================================================================
// SHIPPING SETTINGS MANAGEMENT
// ========================================================================
router.get('/shipping/settings',                requireAdmin, shippingSettingsController.getSettings);
router.get('/shipping/methods/active',          shippingSettingsController.getActiveMethods);
router.post('/shipping/methods',                requireAdmin, shippingSettingsController.addMethod);
router.patch('/shipping/methods/:methodId',     requireAdmin, shippingSettingsController.updateMethod);
router.delete('/shipping/methods/:methodId',    requireAdmin, shippingSettingsController.deleteMethod);
router.patch('/shipping/methods/:methodId/toggle', requireAdmin, shippingSettingsController.toggleMethodStatus);
router.patch('/shipping/free-shipping',         requireAdmin, shippingSettingsController.updateFreeShipping);
router.post('/shipping/methods/reorder',        requireAdmin, shippingSettingsController.reorderMethods);

// ========================================================================
// USER AUTHENTICATION & REGISTRATION
// ========================================================================
// User registration from different sources
router.post('/register',                      usersController.registerUser);
router.post('/registerUser/fromAdmin',        usersController.registerUserFromAdmin);

// Authentication & password management
router.post('/login',                         usersController.loginUser);
router.post('/logout',                        usersController.logoutUser);
router.patch('/update/user/:id',              usersController.updateUser);
router.post('/forgotpassword',                usersController.forgotPassword);
router.post('/resetpassword',                 usersController.resetPassword);
router.patch('/changepassword/:id',           usersController.changepassword);

// ========================================================================
// USER MANAGEMENT (Admin Panel)
// ========================================================================
router.get('/get/all/users',                   adminUsersController.getAllUser);
router.get('/get/users/basic-info',              adminUsersController.getAllUsersBasicInfo);
// router.patch('/update/user/:id',              adminUsersController.updateUser);
router.patch('/delete/user/:id',                 adminUsersController.deleteUser);
router.patch('/status/user/:id',                 adminUsersController.statusUser);
router.get('/get/user/:id',                      adminUsersController.getUserById);
router.patch('/admin/reset-password/:id',        adminUsersController.resetUserPassword);

// ========================================================================
// BLOG MANAGEMENT (Main E-commerce)
// ========================================================================
// Blog Posts CRUD
router.post('/create/newblog',                    blogController.createBlog);
router.get('/get/blog',                           blogController.getAllBlogFull);
router.get('/get/blog/latest',                    blogController.getAllBlogLatest);
router.get('/get/blog/latest/old',                blogController.getAllBlogLatestOnlyOld);
router.get('/get/blog/:id',                       blogController.getBlog);
router.get('/get/blog/metadata/:permalink',       blogController.getBlogMetaData);
router.patch('/update/blog/:id',                  blogController.updateBlog);
router.delete('/delete/blog/:id',                 blogController.deleteBlog);
router.patch('/status/blog/:id',                  blogController.statusBlog);
router.patch('/feature/blog/:id',                 blogController.featureBlog);

// Blog Categories
router.post('/create/blog/category',                blogCategoryController.createBlogCategory);
router.get('/get/blog/category/all',                blogCategoryController.getAllCategory);
router.delete('/delete/blog/category/:id',          blogCategoryController.deleteBlogCategory);
router.patch('/feature/blog/category/:id',          blogCategoryController.featureBlogCategory);
router.patch('/status/blog/category/:id',           blogCategoryController.statusBlogCategory);
router.patch('/update/blog/category/:id',           blogCategoryController.updateBlogCategory);

// Blog Tags
router.post('/create/blog/tag',                     blogTagsController.createBlogTag);
router.get('/get/blog/tag/all',                     blogTagsController.getAllBlogTag);
router.delete('/delete/blog/tag/:id',               blogTagsController.deleteBlogTag);
router.patch('/update/blog/tag/:id',                blogTagsController.updateBlogTag);
router.patch('/publish/blog/tag/:id',               blogTagsController.publishBlogTag);

// ========================================================================
// PRODUCT TAGS MANAGEMENT
// ========================================================================
router.post('/create/product/tag',                    productTagsController.createProductTag);
router.get('/get/product/tag',                        productTagsController.getAllProductTag);
router.delete('/delete/product/tag/:id',              productTagsController.deleteProductTag);
router.patch('/update/product/tag/:id',               productTagsController.updateProductTag);
router.patch('/publish/product/tag/:id',              productTagsController.publishProductTag);

// ========================================================================
// PRODUCT CATEGORIES MANAGEMENT
// ========================================================================
router.post('/create/product/category',               productCategoriesController.createProductCategory);
router.get('/get/product/category',                   productCategoriesController.getAllProductCategory);
router.get('/get/category/ssr',                       productCategoriesController.getCategoryServersideRendering);
router.get('/get/product/category/customized',        productCategoriesController.getProductCategoryCustomized);
router.delete('/delete/product/category/:id',         productCategoriesController.deleteProductCategory);
router.patch('/feature/product/category/:id',         productCategoriesController.featureProductCategory);
router.patch('/status/product/category/:id',          productCategoriesController.statusProductCategory);
router.patch('/update/product/category/:id',          productCategoriesController.updateProductCategory);
router.patch('/update/product/subcategory/:id',       productCategoriesController.updateProductsubCategory);
router.get('/get/category/byid/:id',                  productCategoriesController.getCategoryById)
router.post('/product/subcategory',                   productCategoriesController.createProductSubCategory);
router.get('/get/category/Details/:id',               productCategoriesController.getCategoryDetailsById);
router.post('/create/category/for/navbar',            productCategoriesController.createCategoryForNavbar);
router.get('/get/category/for/navbar',                productCategoriesController.getCategoryForNavbar);
router.get('/get/categorydetails/:id',                productCategoriesController.getCategoryDetails);
router.get('/get/categorydetailsFull/:id',            productCategoriesController.getCategoryDetailsfull);
router.get('/get/subcategorydetails/:name',           productCategoriesController.getSubCategoryDetails);
router.get('/get/subcategory/somedetails/:name',      productCategoriesController.getSubCategoryDetailsSome);
router.get('/get/categories/counts',                  productCategoriesController.getCategoryCounts);

// ========================================================================
// CATEGORY DISPLAY PRODUCTS MANAGEMENT
// ========================================================================
router.post('/category/display-products',              categoryDisplayProductsController.saveDisplayProducts);
router.get('/category/display-products/name/:categoryName', categoryDisplayProductsController.getDisplayProductsByName);
router.get('/category/display-products/:categoryId',   categoryDisplayProductsController.getDisplayProducts);
router.delete('/category/display-products/:categoryId/:productId', categoryDisplayProductsController.removeDisplayProduct);
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
router.post('/create/variant-attribute',                      variantAttributeController.createVariantAttribute);
router.put('/update/variant-attribute/:id',                   variantAttributeController.updateVariantAttribute);
router.put('/update/variant-attribute-value/:id/:valueSlug',  variantAttributeController.updateVariantAttributeValue);
router.delete('/delete/variant-attribute/:id',                variantAttributeController.deleteVariantAttribute);
router.post('/add/variant-attribute-value/:id',               variantAttributeController.addValueToAttribute);
router.delete('/delete/variant-attribute-value/:id/:valueSlug', variantAttributeController.deleteValueFromAttribute);
router.put('/update/variant-attribute-value-details/:id/:valueSlug', variantAttributeController.updateValueDetails);
router.post('/add/variant-attribute-model/:id/:valueSlug',    variantAttributeController.addModelToValue);
router.delete('/delete/variant-attribute-model/:id/:valueSlug/:modelSlug', variantAttributeController.deleteModelFromValue);
router.put('/update/variant-attribute-model/:id/:valueSlug/:modelSlug', variantAttributeController.updateModelStatus);
router.put('/update/variant-attribute-model-details/:id/:valueSlug/:modelSlug', variantAttributeController.updateModelDetails);

// ========================================================================
// PRODUCT MANAGEMENT (Admin Panel)
// ========================================================================
// Product CRUD Operations
router.post('/create/product',                        adminProductController.createProduct); 
router.patch('/update/product/:id',                   adminProductController.updateProduct);
router.patch('/status/product/:id',                   adminProductController.statusProduct); 
router.patch('/feature/product/:id',                  adminProductController.featureProduct);
router.get('/get/product',                            adminProductController.getAllActiveProduct);
router.get('/get/all/product/for/blog',               adminProductController.getAllActiveProductForBlog);
router.get('/get/product/for/admin/panal',            adminProductController.getAllActiveProductForAdminPanel);
router.get('/get/all/products/admin/sidebar',         adminProductController.getAllActiveProductForSidebar);
router.get('/get/deactive/product',                    adminProductController.getAllDeactiveProduct);
router.delete('/delete/product/:id',                   adminProductController.deleteProduct);
router.delete('/permanent/delete/product/:id',         adminProductController.deleteProductPermanent);
router.delete('/restore/delete/product/:id',           adminProductController.restoreDeleteProduct);
router.get('/get/deleted/product',                     adminProductController.getDeletedProduct);
router.patch('/delete/product/image/:id',              adminProductController.deleteProductImage);
router.patch('/delete/product/variant-image/:id',      adminProductController.deleteVariantImage)
router.post('/duplicate/product/:id',                  adminProductController.dublicateProductImage);

// Product Retrieval by Name/URL
router.get('/get/product/slug/:slug',                    adminProductController.getProductBySlug);
router.get('/get/product/:productname',                adminProductController.getProductByName);
router.post('/get/product/by/url',                       adminProductController.getProductByproducturl);
router.get('/get/productmetadata/url/:producturl',       adminProductController.getProductmetadataByproducturl);

// Homepage Product Collections
router.get('/get/products/homepage',                   adminProductController.getProductsHomepage);
router.get('/get/products/customized',                 adminProductController.getProductsHomepageCustomized);
router.get('/get/latest/products/homepage',             adminProductController.getLatestProductsHomepage);
router.get('/get/products/by-ids/public',                adminProductController.getProductsByIdsPublic);
router.get('/get/Featureproducts/Homepage',             adminProductController.getFeatureProductsHomepage);
router.get('/get/refurbishedProduct/Homepage',          adminProductController.getRefurbishedProductsHomepage);
router.get('/get/tabletsAndIpads/Homepage',             adminProductController.getTabletsAndIpadsHomepage);
router.get('/get/laptopsAndMacbooks/Homepage',          adminProductController.getLaptopsAndMacbooksHomepage);

// Admin Page Product Management
router.get('/get/all/product/adminpage',                adminProductController.getProductsAdminpage);
router.get('/get/all/newProduct/adminpage',             adminProductController.getNewProductsAdminpage);
router.get('/get/newProduct/variantValues/:id',         adminProductController.getVariantValuesBynewProductId)
router.get('/get/all/product/adminpage/v2',             adminProductController.getProductsAdminpagev2);
router.get('/get/products/by/category/search',          adminProductController.searchProductsByCategory);
router.get('/get/product-central/stats',                adminProductController.getProductCentralStats);
router.get('/get/product/variantValues/:id',            adminProductController.getVariantValuesByProductId);
router.post('/check/stock/availability',                adminProductController.checkStockAvailability);
router.get('/get/product/for/csv',                      adminProductController.getProductsAdminpageforcsv);

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
router.patch('/update/product/review/:id',               productReviewsController.updateProductReviews);
router.get('/get/reviews/:id',                           productReviewsController.getReviewsbyId);
router.get('/all/products/and/reviews/details',          productReviewsController.getProductsAndReviewsDetails);
router.delete('/delete/product/review/:id',              productReviewsController.deleteProductReview);
router.get('/get/all/reviews',                           productReviewsController.getAllReviews);
router.patch('/bulk/update/review/status',               productReviewsController.bulkUpdateReviewStatus);

// ========================================================================
// PRODUCT FAQ MANAGEMENT
// ========================================================================
router.post('/post/product/faq',                          productFaqController.postProductFaq);
router.get('/get/all/product/faqs/:id',                   productFaqController.getAllProductFaqs);
router.patch('/update/product/faq/:id',                   productFaqController.updateProductFaq);
router.get('/get/faq/:id',                                productFaqController.getFaqById);
router.delete('/delete/product/faq/:id',                  productFaqController.deleteProductFaq);
router.post('/reorder/product/faqs',                      productFaqController.reorderProductFaqs);
router.get('/get/all/faqs',                               productFaqController.getAllFaqs);
router.patch('/bulk/update/faq/status',                   productFaqController.bulkUpdateFaqStatus);

// ========================================================================
// PRODUCT RELATED PRODUCTS MANAGEMENT
// ========================================================================
router.post('/post/product/related',                      productRelatedController.postRelatedProduct);
router.get('/get/product/related/:productId',             productRelatedController.getRelatedProducts);
router.delete('/delete/product/related/:relatedId',       productRelatedController.deleteRelatedProduct);
router.post('/reorder/product/related',                   productRelatedController.reorderRelatedProducts);
router.get('/get/product/related/display/:productId',     productRelatedController.getRelatedProductsForDisplay);

// ========================================================================
// ORDER MANAGEMENT
// ========================================================================
router.post('/create/order',                        ordersController.createOrder);
router.get('/get/order',                            ordersController.getAllOrderv1);
router.get('/get/order/export',                     ordersController.getOrdersForExport);  // Dedicated export API
router.get('/get/order/cart/:id',                   ordersController.getOrderCartById);  // Get cart details on demand
router.patch('/update/order/shipping/:id',          ordersController.updateOrderShipping);  // Update shipping details only
router.patch('/update/order/:id',                   ordersController.updateOrder);
router.patch('/update/orders/bulk',                 ordersController.bulkUpdateOrders);  // Bulk update multiple orders
router.patch('/status/order/:id',                   ordersController.statusOrder);
router.delete('/delete/order/:id',                  ordersController.deleteOrder);
router.delete('/restore/delete/order/:id',          ordersController.restoreDeleteOrder);
router.delete('/permanent/delete/order/:id',        ordersController.permanentDeleteOrder);
router.get('/get/deleted/order',                    ordersController.getDeletedOrders)
router.get('/get/order/:id',                        ordersController.getOrderById);
router.get('/get/order/admin/:id',                  ordersController.getOrderByIdAdminSide);
router.get('/get/order/number/:orderNumber',        ordersController.getOrderByOrderNumber);
router.post('/get/order/user',                       ordersController.getOrderByUser);
router.get('/get/order-numbers/user/:userId',       ordersController.getOrderNumbersByUserId);

// ========================================================================
// STATIC META PAGES MANAGEMENT
// ========================================================================
router.get('/get/static-meta-pages',                staticMetaController.getAllStaticMetaPages);
router.get('/get/static-meta-page/:id',             staticMetaController.getStaticMetaPageById);
router.get('/get/static-meta-page/path/:path',      staticMetaController.getStaticMetaPageByPath);
router.post('/create/static-meta-page',             staticMetaController.createStaticMetaPage);
router.patch('/update/static-meta-page/:id',        staticMetaController.updateStaticMetaPage);
router.patch('/toggle-publish/static-meta-page/:id',staticMetaController.togglePublishStatus);
router.delete('/delete/static-meta-page/:id',       staticMetaController.deleteStaticMetaPage);

// ========================================================================
// RETURN ORDER MANAGEMENT
// ========================================================================
router.post('/return/order',                         returnOrderController.returnOrder);
router.get('/get/return/:id',                        returnOrderController.getReturnOrderByID);
router.delete('/delete/return/:id',                  returnOrderController.deleteReturnOrder);
router.patch('/update/return/:id',                   returnOrderController.updateReturnOrder);
router.get('/getallreturn/orders',                   returnOrderController.getAllReturnOrders);
router.patch('/returnOrder/updateStatus/:id',        returnOrderController.updateStatus);
router.get('/get/return-orders/user/:userId',        returnOrderController.getReturnOrdersByUserId);

// ========================================================================
// REQUEST ORDER MANAGEMENT
// ========================================================================
router.post('/return/ThisItem',                       requestOrderController.returnThisItem);
router.get('/get/request/:id',                        requestOrderController.getRequestOrderByID);
router.delete('/delete/request/:id',                  requestOrderController.deleteRequestOrder);
router.get('/getallrequest/orders',                   requestOrderController.getAllRequestOrders);
router.patch('/updatestatus/requestorder/:id',        requestOrderController.updateStatusRequestOrder);
router.get('/user/approve/request/order/:userId',     requestOrderController.getApproveRequestOrder);
router.get('/user/allrequest/:userId',                requestOrderController.getAllRequestByUserId);

// ========================================================================
// RETURN ORDER OPTIONS MANAGEMENT (Dynamic Dropdowns)
// ========================================================================
router.get('/return-order-options',                    returnOrderOptionsController.getAllOptions);
router.get('/return-order-options/grouped',            returnOrderOptionsController.getAllOptionsGrouped);
router.get('/return-order-options/type/:type',         returnOrderOptionsController.getOptionsByType);
router.post('/return-order-options',                   returnOrderOptionsController.createOption);
router.patch('/return-order-options/:id',              returnOrderOptionsController.updateOption);
router.patch('/return-order-options/publish/:id',      returnOrderOptionsController.togglePublish);
router.delete('/return-order-options/:id',             returnOrderOptionsController.deleteOption);
router.post('/return-order-options/seed',              returnOrderOptionsController.seedDefaultOptions);

// ========================================================================
// COUPON MANAGEMENT
// ========================================================================
router.post('/create/coupon',                          couponController.createCoupon);
router.get('/get/all/coupons',                         couponController.getAllCoupon);
router.get('/get/coupon/:id',                          couponController.getCouponById);
router.patch('/status/coupon/:id',                     couponController.stausCoupon);
router.patch('/update/coupon/:id',                     couponController.updateCoupon);
router.delete('/delete/coupon/:id',                    couponController.deleteCoupon);

// ========================================================================
// ADMIN STATISTICS & UTILITIES
// ========================================================================
// Dashboard Statistics
router.get('/get/stats',                               adminStatsController.getStats);
router.get('/get/stats2',                              adminStatsController.getStats2);
router.get('/get/stats3',                              adminStatsController.getStats3);
router.get('/get/stats4',                              adminStatsController.getStats4);
router.get('/get/order/stats',                         adminStatsController.getOrderStats);  // Fast order stats for tabs
router.get('/get/files',                               adminStatsController.getFiles);
router.post('/upload/file',                            adminStatsController.uploadFile);
router.patch('/update/file',                           adminStatsController.renameFile);
router.delete('/delete/file',                          adminStatsController.deleteFile);
router.get('/top/product/sold',                        adminStatsController.getTopProductSold);

// Newsletter Management
router.post('/newsletter/subscribers',                 adminStatsController.NewsletterSubscribers);
router.post('/blackfridaymodal',                       adminStatsController.blackfridaymodal);
router.get('/get/newsletters',                         adminStatsController.getNewsletters);

// CSV Upload & Bulk Operations
router.post('/upload/csv',                             adminStatsController.uploadCSV);
router.post('/upload/csv/all-products',                adminStatsController.uploadCSVAllProducts);
router.post('/upload/csv/with/accessories',            adminStatsController.uploadCSVWithAccessories);

// Sitemap Generation
router.post('/create/sitemap',                         siteMapController.createSitemap);
router.post('/create/sitemap/optimized',               optimizedSitemapController.createSitemapOptimized);

// ========================================================================
// MESSAGE/CHAT SYSTEM
// ========================================================================
router.post('/send/messages/senderid/:receiver',       messageController.sendMessagesFromAdmin);
router.post('/send/messageFromUser/senderid/:senderId',messageController.sendMessage);
router.get('/get/messages/senderid/:sender',           messageController.getMessages);
router.get('/get/users/whosend/messages',              messageController.getUsersWhoSendMessage);
router.delete('/delete/message/:messageId',            messageController.deleteMessage);
router.delete('/delete/allmessage/ofThisUser/:userId', messageController.deleteAllMessageOfThisUser);
router.put('/update/message/:messageId',               messageController.updateMessage);
router.get('/get/total/messages/count',                messageController.getTotalMessagesCount);
router.get('/get/conversations/:userId',               messageController.getConversations);
router.get('/admin/conversations/:userId',             messageController.getConversationsForAdmin);
router.get('/messages/all-conversations',              messageController.getAllConversations);
router.post('/messages/orders/unread-counts',          messageController.getUnreadCountsForOrders);
router.get('/get/messages/:userId/:orderId',           messageController.getMessagesByConversation);
router.post('/send/email-notification/:userId',        messageController.sendEmailNotificationToUser);
router.patch('/toggle/message/read-status/:userId/:orderId', messageController.toggleLastMessageReadStatus);
router.post('/assign/general-chat-to-order/:userId/:orderId', messageController.assignGeneralChatToOrder);

// CONVERSATION TAGS
// IMPORTANT: Specific routes MUST come before parameterized routes!
router.get('/conversation/tags/predefined/all',                  messageController.getAllPredefinedTags);
router.post('/conversation/tags/:userId/:conversationId',        messageController.addTagToConversation);
router.delete('/conversation/tags/:userId/:conversationId/:tagName', messageController.removeTagFromConversation);
router.get('/conversation/tags/:userId/:conversationId',         messageController.getConversationTags);

// PRELOADED MESSAGES (Quick Reply Templates)
router.get('/preloaded-messages',                                preloadedMessageController.getAllPreloadedMessages);
router.get('/preloaded-messages/active',                         preloadedMessageController.getActivePreloadedMessages);
router.get('/preloaded-messages/:id',                            preloadedMessageController.getPreloadedMessageById);
router.post('/preloaded-messages',                               preloadedMessageController.createPreloadedMessage);
router.patch('/preloaded-messages/:id',                          preloadedMessageController.updatePreloadedMessage);
router.patch('/preloaded-messages/toggle/:id',                   preloadedMessageController.togglePreloadedMessageStatus);
router.delete('/preloaded-messages/:id',                         preloadedMessageController.deletePreloadedMessage);

// AI MESSAGE IMPROVEMENT (OpenAI)
router.post('/ai/improve-message',                               aiMessageController.improveMessage);

// ========================================================================
// VISITOR MESSAGES (Chat Widget)
// ========================================================================
// Admin panel routes
router.get('/visitor-messages',                                  visitorMessageController.getAllVisitors);
router.get('/visitor-messages/unread-count',                     visitorMessageController.getUnreadCount);
router.get('/visitor-messages/:id',                              visitorMessageController.getMessagesByVisitorId);
router.put('/visitor-messages/:id/read',                         visitorMessageController.markAsRead);
router.put('/visitor-messages/:id/unread',                       visitorMessageController.markAsUnread);
router.post('/visitor-messages/:id/reply',                       visitorMessageController.uploadMiddleware, visitorMessageController.sendReply);
router.delete('/visitor-messages/:id',                           visitorMessageController.deleteConversation);

// Frontend chat widget routes
router.post('/visitor-messages/create',                          visitorMessageController.createConversation);
router.post('/visitor-messages/:id/message',                     visitorMessageController.uploadMiddleware, visitorMessageController.addMessage);
router.get('/visitor-messages/session/:sessionId',               visitorMessageController.getConversationBySession);

// Auto-reply settings routes
router.get('/visitor-messages/auto-reply/settings',              visitorMessageController.getAutoReplySettings);
router.post('/visitor-messages/auto-reply/settings',             visitorMessageController.saveAutoReplySettings);
router.patch('/visitor-messages/auto-reply/toggle',              visitorMessageController.toggleAutoReply);

// Away status routes
router.get('/visitor-messages/away/settings',                    visitorMessageController.getAwayStatus);
router.post('/visitor-messages/away/settings',                   visitorMessageController.saveAwayStatus);
router.patch('/visitor-messages/away/toggle',                    visitorMessageController.toggleAwayStatus);

// Transfer to messages routes
router.get('/visitor-messages/check-user/:email',                visitorMessageController.checkUserByEmail);
router.post('/visitor-messages/:id/transfer',                    visitorMessageController.transferToMessages);

// ========================================================================
// ROLE AND PERMISSIONS MANAGEMENT
// ========================================================================
router.post('/create/role',                           roleAndPermissons.createRole);
router.get('/get/role/:id',                           roleAndPermissons.getRoleByID);
router.patch('/update/role/:id',                      roleAndPermissons.updateRole);
router.delete('/delete/role/:id',                     roleAndPermissons.deleteRole);
router.get('/get/all/roles',                          roleAndPermissons.getAllRole);
router.get('/get/users/by-role/:roleId',              roleAndPermissons.getUsersByRole);
router.post('/implement/permission/on/role',          roleAndPermissons.implementPermissionOnRole);

// ========================================================================
// PDF LABELS MANAGEMENT
// ========================================================================
router.post('/upload/labels',                         labelController.uploadLabels);
router.get('/get/labels',                             labelController.getAllLabels);
router.get('/get/label/:id',                          labelController.getLabelById);
router.patch('/update/label/:id',                     labelController.updateLabel);
router.delete('/delete/label/:id',                    labelController.deleteLabel);
router.get('/view/label/:id',                         labelController.viewLabel);
router.get('/get/one/unused/label',                   labelController.getOneUnusedLabel);
router.get('/order/:id/label',                        labelController.getLabelOfOrder);
router.post('/assign/label/to/order',                 labelController.assignLabelToOrder);
router.get('/return-order/:id/label',                 labelController.getLabelOfReturnOrder);
router.post('/assign/label/to/return-order',          labelController.assignLabelToReturnOrder);
// ========================================================================
// NEW BLOG SYSTEM (Advanced Blogging Platform)
// ========================================================================
// Blog Posts
router.post('/newblog/blog/posts', handleBlogUpload, createBlogPost);
router.get('/newblog/get/all/blog/posts', getAllBlogPosts);
router.get('/newblog/blog/posts/:id', getBlogPostById);
router.put('/newblog/blog/posts/:id', handleBlogUpload, updateBlogPost);
router.delete('/newblog/blog/posts/:id', deleteBlogPost);
router.get('/newblog/blog/postsBySlug/:slug', getBlogPostBySlug);
router.get('/newblog/blog/postsBySlugWithoutCache/:slug', getBlogPostBySlugWithoutCache);

// Blog Categories
router.get('/newblog/blog/categories', getAllCategories);
router.get('/newblog/blog/categories/:id', getCategoryById);
router.post('/newblog/blog/categories', createCategory);
router.put('/newblog/blog/categories/:id', updateCategory);
router.delete('/newblog/blog/categories/:id', deleteCategory);
router.get('/newblog/blog/category-stats', getCategoryStats);

// ========================================================================
// FOOTER PAGES MANAGEMENT
// ========================================================================
// Note: More specific routes should come before parameterized routes
router.get('/footer-pages/get/all/pages', getAllFooterPages);
router.get('/footer-pages/pagesBySlug/:slug', getFooterPageBySlug);
router.post('/footer-pages/pages', handleFooterPageUpload, createFooterPage);
router.get('/footer-pages/pages/:id', getFooterPageById);
router.put('/footer-pages/pages/:id', handleFooterPageUpload, updateFooterPage);
router.delete('/footer-pages/pages/:id', deleteFooterPage);

// ========================================================================
// DEALS & DISCOUNTS MANAGEMENT
// ========================================================================
router.post('/create/deal', requireAdmin, dealsController.createDeal);
router.get('/get/all/deals', dealsController.getAllDeals);
router.get('/get/active/deals', dealsController.getActiveDeals);
router.get('/get/deal/:id', dealsController.getDealById);
router.put('/update/deal/:id', requireAdmin, dealsController.updateDeal);
router.patch('/expire/deal/:id', requireAdmin, dealsController.markExpired);
router.delete('/delete/deal/:id', requireAdmin, dealsController.deleteDeal);

// ========================================================================
// FOOTER SETTINGS MANAGEMENT
// ========================================================================
router.get('/footer/settings', footerSettingsController.getFooterSettings);
router.post('/footer/settings', requireAdmin, footerSettingsController.saveFooterSettings);
router.patch('/footer/settings/:section', requireAdmin, footerSettingsController.updateFooterSection);
router.post('/footer/upload-image', requireAdmin, footerSettingsController.handleFooterImageUpload, footerSettingsController.uploadFooterImage);

// ========================================================================
// HOMEPAGE DATA MANAGEMENT
// ========================================================================
// SEO-only (same fields as new blog: metaTitle, metaDescription, metaTags = keywords, metaSchema)
router.get('/homepage-data/public/seo', homepageDataController.getHomepagePublicSeo);
router.get('/homepage-data/seo', requireAdmin, homepageDataController.getHomepageSeo);
router.patch('/homepage-data/seo', requireAdmin, homepageDataController.patchHomepageSeo);
router.get('/homepage-data', requireAdmin, homepageDataController.getHomepageData);
router.get('/homepage-data/public', homepageDataController.getHomepageData);
router.post('/homepage-data', requireAdmin, homepageDataController.handleHomepageDataSave, homepageDataController.saveHomepageData);
router.post('/homepage-data/upload-image', requireAdmin, homepageDataController.handleHomepageImageUpload, homepageDataController.uploadHomepageImage);

router.get('/homepage-nav-links/public', homepageNavLinksController.getHomepageNavLinksPublic);
router.put('/homepage-nav-links', requireAdmin, homepageNavLinksController.putHomepageNavLinks);

// ========================================================================
// BANNER TEXT MANAGEMENT (Feature Text After Banner)
// ========================================================================
const bannerTextController = require('../controller/bannerTextController');
router.get('/banner-text', requireAdmin, bannerTextController.getBannerText);
router.get('/banner-text/public', bannerTextController.getBannerTextPublic);
router.post('/banner-text', requireAdmin, bannerTextController.saveBannerText);

// ========================================================================
// BANNER MANAGEMENT (Hero Banners)
// ========================================================================
const bannerRoutes = require('./bannerRoutes');
router.use('/', bannerRoutes); // Mount at root since routes already include full paths

// ========================================================================
// GOOGLE SEARCH CONSOLE VERIFICATION
// ========================================================================
const googleSearchConsoleController = require('../controller/googleSearchConsoleController');
router.get('/get/google-search-console-verification', googleSearchConsoleController.getVerificationCode);
router.post('/update/google-search-console-verification', requireAdmin, googleSearchConsoleController.updateVerificationCode);
router.delete('/delete/google-search-console-verification', requireAdmin, googleSearchConsoleController.deleteVerificationCode);

// ========================================================================
// HOMEPAGE FEATURES MANAGEMENT
// ========================================================================
const homepageFeatureController = require('../controller/homepageFeatureController');
const { handleHomepageFeatureUpload } = require('../controller/homepageFeatureController');
// Public: active features only (must be before /get/homepage-features)
router.get('/get/homepage-features/active', homepageFeatureController.getHomepageFeaturesActive);
// Admin
router.get('/get/homepage-features', requireAdmin, homepageFeatureController.getHomepageFeatures);
router.post('/create/homepage-feature', requireAdmin, handleHomepageFeatureUpload, homepageFeatureController.createHomepageFeature);
router.put('/update/homepage-feature/:id', requireAdmin, handleHomepageFeatureUpload, homepageFeatureController.updateHomepageFeature);
router.delete('/delete/homepage-feature/:id', requireAdmin, homepageFeatureController.deleteHomepageFeature);
router.delete('/delete/homepage-feature-image/:id', requireAdmin, homepageFeatureController.deleteHomepageFeatureImage);
router.patch('/toggle/homepage-feature/:id', requireAdmin, homepageFeatureController.toggleHomepageFeature);
router.post('/reorder/homepage-features', requireAdmin, homepageFeatureController.reorderHomepageFeatures);

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
  requireAdmin,
  homepageSliderWidgetController.getHomepageSliderWidget
);
router.post(
  '/homepage-slider-widget',
  requireAdmin,
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
  homepageNewsletterWidgetController.getHomepageNewsletterWidgetPublic
);
router.get(
  '/homepage-newsletter-widget',
  requireAdmin,
  homepageNewsletterWidgetController.getHomepageNewsletterWidget
);
router.post(
  '/homepage-newsletter-widget',
  requireAdmin,
  handleHomepageNewsletterWidgetUpload,
  homepageNewsletterWidgetController.saveHomepageNewsletterWidget
);

// ========================================================================
// SITE WIDGET VISIBILITY (global enable/disable per widget type)
// ========================================================================
const siteWidgetSettingsController = require('../controller/siteWidgetSettingsController');
router.get('/site-widget-settings/public', siteWidgetSettingsController.getSiteWidgetSettingsPublic);
router.get(
  '/site-widget-settings',
  requireAdmin,
  siteWidgetSettingsController.getSiteWidgetSettingsAdmin
);
router.put(
  '/site-widget-settings',
  requireAdmin,
  siteWidgetSettingsController.putSiteWidgetSettings
);

// ========================================================================
// DEALS MODAL (Hot UK Deals / Black Friday modal — singleton CMS)
// ========================================================================
const dealsModalController = require('../controller/dealsModalController');
const { handleDealsModalUpload } = dealsModalController;
router.get('/deals-modal/public', dealsModalController.getDealsModalPublic);
router.get('/deals-modal', requireAdmin, dealsModalController.getDealsModalAdmin);
router.post(
  '/deals-modal',
  requireAdmin,
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
  requireAdmin,
  announcementBannerController.getAnnouncementBannerAdmin
);
router.put(
  '/announcement-banner',
  requireAdmin,
  announcementBannerController.putAnnouncementBanner
);

// ========================================================================
// NAVBAR HEADER (Need help? phone — singleton, editable from navbar order admin)
// ========================================================================
const navbarHeaderController = require('../controller/navbarHeaderController');
router.get('/navbar-header/public', navbarHeaderController.getNavbarHeaderPublic);
router.get('/navbar-header', requireAdmin, navbarHeaderController.getNavbarHeaderAdmin);
router.post('/navbar-header', requireAdmin, navbarHeaderController.saveNavbarHeader);

// ========================================================================
// CATEGORY CARDS MANAGEMENT
// ========================================================================
const categoryCardController = require('../controller/categoryCardController');
const { handleCategoryCardUpload } = require('../controller/categoryCardController');
router.get('/get/category-cards/active', categoryCardController.getCategoryCardsActive);
router.get('/get/category-cards/section-settings', categoryCardController.getCategoryCardsSectionSettings);
router.put('/category-cards/section-settings', requireAdmin, categoryCardController.updateCategoryCardsSectionSettings);
router.get('/get/category-cards', requireAdmin, categoryCardController.getCategoryCards);
router.post('/create/category-card', requireAdmin, handleCategoryCardUpload, categoryCardController.createCategoryCard);
router.put('/update/category-card/:id', requireAdmin, handleCategoryCardUpload, categoryCardController.updateCategoryCard);
router.delete('/delete/category-card/:id', requireAdmin, categoryCardController.deleteCategoryCard);
router.delete('/delete/category-card-image/:id', requireAdmin, categoryCardController.deleteCategoryCardImage);
router.patch('/toggle/category-card/:id', requireAdmin, categoryCardController.toggleCategoryCard);
router.post('/reorder/category-cards', requireAdmin, categoryCardController.reorderCategoryCards);

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
router.get('/get/buy-now-pay-later/active', promotionalSectionsController.getBuyNowPayLaterActive);
router.get('/get/sell-buy-cards/active', promotionalSectionsController.getSellBuyCardsActive);
router.get('/get/tiny-phone-banner/active', promotionalSectionsController.getTinyPhoneBannerActive);
// Admin GET
router.get('/get/buy-now-pay-later', requireAdmin, promotionalSectionsController.getBuyNowPayLater);
router.get('/get/sell-buy-cards', requireAdmin, promotionalSectionsController.getSellBuyCards);
router.get('/get/tiny-phone-banner', requireAdmin, promotionalSectionsController.getTinyPhoneBanner);
// Admin POST update (create if not exists)
router.post('/update/buy-now-pay-later', requireAdmin, handleBuyNowPayLaterUpload, promotionalSectionsController.updateBuyNowPayLater);
router.post('/update/sell-buy-cards', requireAdmin, handleSellBuyCardsUpload, promotionalSectionsController.updateSellBuyCards);
router.post('/update/tiny-phone-banner', requireAdmin, handleTinyPhoneBannerUpload, promotionalSectionsController.updateTinyPhoneBanner);
// Admin DELETE image from promotional section
router.delete('/delete/promotional-image', requireAdmin, promotionalSectionsController.deletePromotionalImage);

// ========================================================================
// LOGO MANAGEMENT
// ========================================================================
const logoController = require('../controller/logoController');
const { handleLogoUpload, handleFaviconUpload } = require('../controller/logoController');
router.get('/get/logo', requireAdmin, logoController.getLogo);
router.get('/get/logo/public', logoController.getLogoPublic);
router.post('/update/logo', requireAdmin, handleLogoUpload, logoController.updateLogo);
router.delete('/delete/logo', requireAdmin, logoController.deleteLogo);
router.post('/update/favicon', requireAdmin, handleFaviconUpload, logoController.updateFavicon);
router.delete('/delete/favicon', requireAdmin, logoController.deleteFavicon);

// ========================================================================
// SITE-WIDE THEME (brand greens → CSS variables on storefront)
// ========================================================================
const siteThemeController = require('../controller/siteThemeController');
router.get('/site-theme', requireAdmin, siteThemeController.getThemeAdmin);
router.get('/site-theme/public', siteThemeController.getThemePublic);
router.post('/site-theme', requireAdmin, siteThemeController.saveTheme);
// CMS typography (Next.js + admin)
router.get('/api/theme', siteThemeController.getTypographyPublic);
router.put('/api/theme', requireAdmin, siteThemeController.updateTypography);

// ========================================================================
// TRUSTPILOT SETTINGS MANAGEMENT
// ========================================================================
const trustpilotController = require('../controller/trustpilotController');
router.get('/trustpilot', requireAdmin, trustpilotController.getTrustpilotSettings);
router.get('/trustpilot/public', trustpilotController.getTrustpilotSettingsPublic);
router.post('/trustpilot', requireAdmin, trustpilotController.saveTrustpilotSettings);

// ========================================================================
// SITE SCRIPTS (Semrush, Ahrefs, GSC, custom head/body)
// ========================================================================
const siteScriptsController = require('../controller/siteScriptsController');
router.get('/site-scripts', requireAdmin, siteScriptsController.getSiteScriptsSettings);
router.get('/site-scripts/public', siteScriptsController.getSiteScriptsSettingsPublic);
router.post('/site-scripts', requireAdmin, siteScriptsController.saveSiteScriptsSettings);

// ========================================================================
// SITE-WIDE SCHEMA (JSON-LD structured data on every page)
// ========================================================================
const siteWideSchemaController = require('../controller/siteWideSchemaController');
router.get('/site-wide-schema', requireAdmin, siteWideSchemaController.getSiteWideSchema);
router.get('/site-wide-schema/public', siteWideSchemaController.getSiteWideSchemaPublic);
router.post('/site-wide-schema', requireAdmin, siteWideSchemaController.saveSiteWideSchema);

// ========================================================================
// NEWSLETTER EMAIL TEMPLATES (admin-editable copy only)
// ========================================================================
const newsletterEmailTemplatesController = require('../controller/newsletterEmailTemplatesController');
router.get(
  '/newsletter-email-templates',
  requireAdmin,
  newsletterEmailTemplatesController.getAdmin
);
router.put(
  '/newsletter-email-templates',
  requireAdmin,
  newsletterEmailTemplatesController.saveAdmin
);

// ========================================================================
// CRON JOB ROUTES
// ========================================================================
router.use('/cron', cronRoutes);

// ========================================================================
// EXPORT ROUTER
// ========================================================================
module.exports = router;