// controller/adminProductController.js
const db = require("../../connections/mongo");
const Product = require("../models/product");
const GroupProductPrice = require("../models/groupProductPrice");
const productCategory = require("../models/productCategories");

const bcrypt = require("bcrypt");
const crypto = require('crypto');
const { features } = require("process");
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const moment = require('moment');
const mongoose = require('mongoose');

// Import services
const updateProductService = require('../services/productService/updateProduct');
const createProductService = require('../services/productService/createProduct');



// Use memory storage for Vercel Blob uploads
const storage = multer.memoryStorage();

const uploadImage = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
}).any();

const adminProductController = {

    createProduct: async (req, res) => {
        try {
            uploadImage(req, res, async function (err) {
                if (err instanceof multer.MulterError) {
                    console.error('Multer error:', err);
                    return res.json({ message: 'Error uploading image', status: 400 });
                } else if (err) {
                    console.error('File upload error:', err);
                    return res.json({ message: 'Failed to upload image', status: 500 });
                }

                // Extract data from the request body
                const {
                    name, category, subcategory, tags, brand, condition, is_featured,
                    is_refundable, is_authenticated, low_stock_quantity_alert,
                    Shipping_Information, has_warranty, productType, discount,
                    Purchase_Quantity, status, Seo_Meta, Product_summary,
                    Product_description, specifications, comes_with, variantDesc,
                    sim_option, productSalePrice, battery, producturl
                } = req.body;

                // Call service to handle business logic
                const result = await createProductService.createProduct({
                    name, category, subcategory, tags, brand, condition, is_featured,
                    is_refundable, is_authenticated, low_stock_quantity_alert,
                    has_warranty, productType, status, Seo_Meta, Product_summary,
                    Product_description, specifications, comes_with, variantDesc,
                    sim_option, battery, producturl, req
                });

                // Handle service result
                if (!result.success) {
                    return res.json({ message: result.message, status: result.status });
                }

                return res.json({ message: result.message, product: result.product, status: result.status });
            });

        } catch (error) {
            console.error('Error creating product:', error);
            return res.json({ message: 'Failed to create product', status: 500 });
        }
    },

    getAllActiveProduct: async (req, res) => {
        try {
            const resolveOriginalPrice = (product) => {
                const directPrice = Number(product?.price);
                if (Number.isFinite(directPrice) && directPrice > 0) return directPrice;

                const variants = Array.isArray(product?.variantValues)
                    ? product.variantValues
                    : [];
                for (const v of variants) {
                    const sale = Number(v?.salePrice);
                    if (Number.isFinite(sale) && sale > 0) return sale;
                    const regular = Number(v?.Price);
                    if (Number.isFinite(regular) && regular > 0) return regular;
                }

                const minSale = Number(product?.minSalePrice);
                if (Number.isFinite(minSale) && minSale > 0) return minSale;
                const minPrice = Number(product?.minPrice);
                if (Number.isFinite(minPrice) && minPrice > 0) return minPrice;

                return 0;
            };

            const products = await Product.find({ status: 'true' }).lean();
            
            if (!products) {
                return res.json({ message: 'Products not found', status: 404 });
            }

            const scopedGroupId = req.pricingScope?.groupId || null;
            if (scopedGroupId && mongoose.Types.ObjectId.isValid(scopedGroupId)) {
                const overrides = await GroupProductPrice.find({ groupId: scopedGroupId })
                    .select('productId price')
                    .lean();
                console.log('[getAllActiveProduct] group pricing mode', {
                    scopedGroupId,
                    overridesCount: overrides.length,
                    productsCount: products.length,
                });
                const normalizeId = (value) => {
                    if (!value) return "";
                    if (typeof value === "string") return value.trim().toLowerCase();
                    if (typeof value === "object" && value._id) {
                        return String(value._id).trim().toLowerCase();
                    }
                    return String(value).trim().toLowerCase();
                };

                // Keep the latest valid override per product id.
                const overrideMap = new Map();
                for (const item of overrides) {
                    const key = normalizeId(item.productId);
                    const numericPrice = Number(item.price);
                    if (!key || !Number.isFinite(numericPrice) || numericPrice <= 0) continue;
                    overrideMap.set(key, numericPrice);
                }

                const productsWithResolvedPrice = products.map((product) => {
                    const originalPrice = resolveOriginalPrice(product);
                    const groupPrice = overrideMap.get(normalizeId(product._id));
                    const resolvedPrice =
                        Number.isFinite(groupPrice) && groupPrice > 0 ? groupPrice : originalPrice;

                    return {
                        ...product,
                        // Standardized fields for pricing-group consumers
                        price: resolvedPrice,
                        originalPrice,
                        groupPrice: Number.isFinite(groupPrice) ? groupPrice : null,
                    };
                });

                return res.json({ message: 'Products retrieved', products: productsWithResolvedPrice, status: 201 });
            }

            console.log('[getAllActiveProduct] default pricing mode', {
                scopedGroupId,
                productsCount: products.length,
            });

            const productsWithStandardPrice = products.map((product) => {
                const originalPrice = resolveOriginalPrice(product);
                return {
                    ...product,
                    price: originalPrice,
                    originalPrice,
                    groupPrice: null,
                };
            });

            return res.json({ message: 'Products retrieved', products: productsWithStandardPrice, status: 201 });
        } catch (error) {
            console.error('Error getting products:', error);
            return res.json({ message: 'Failed to get products', status: 500 });
        }

    },
    getAllDeactiveProduct: async (req, res) => {
        try {
            const products = await Product.find({ status: false, isdeleted: false });

            if (!products) {
                return res.json({ message: 'Products not found', status: 404 });
            }

            return res.json({ message: 'Products retrieved', products, status: 201 });  
        } catch (error) {
                console.error('Error getting products:', error);
                return res.json({ message: 'Failed to get products', status: 500 });    

            }
    },

    updateProduct: async (req, res) => {
        try {
            uploadImage(req, res, async function (err) {
                if (err instanceof multer.MulterError) {
                    console.error('Multer error:', err);
                    return res.json({ message: 'Error uploading image', status: 400 });
                } else if (err) {
                    console.error('Error uploading image:', err);
                    return res.json({ message: 'Failed to upload image', status: 500 });
                }

                // Extract data from request
                const {
                    name, category, subcategory, tags, brand, condition, is_featured,
                    is_refundable, is_authenticated, low_stock_quantity_alert,
                    Shipping_Information, has_warranty, productType, discount,
                    Purchase_Quantity, status, Seo_Meta, Product_summary,
                    Product_description, Product_description_blocks, descriptionBlockImageCount,
                    comesWithItems, topSectionItems, selectOption, specifications, variantDesc,
                    sim_option, battery, producturl, seeAccessoriesWeDontNeed, topsection,
                    perks_and_benefits
                } = req.body;

                const { id } = req.params;

                // Call service to handle business logic
                const result = await updateProductService.updateProduct(id, {
                    name, category, subcategory, tags, brand, condition, is_featured,
                    is_refundable, is_authenticated, low_stock_quantity_alert,
                    has_warranty, productType, status, Seo_Meta, Product_summary,
                    Product_description, Product_description_blocks, descriptionBlockImageCount,
                    comesWithItems, topSectionItems, selectOption, specifications, variantDesc,
                    sim_option, battery, producturl, seeAccessoriesWeDontNeed, topsection,
                    perks_and_benefits, req
                });

                // Handle service result
                if (!result.success) {
                    return res.json({ message: result.message, status: result.status });
                }

                return res.json({ message: result.message, product: result.product, status: result.status });
            });

        } catch (error) {
            console.error('Error updating product:', error);
            return res.json({ message: 'Failed to update product', status: 500 });
        }
    },

    deleteProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedProduct = await Product.findByIdAndUpdate(id, { isdeleted: true },{ status: false }, { new: true });
            if (!deletedProduct) {
                return res.json({ message: 'Product not found', status: 404 });
            }
            return res.json({ message: 'Product deleted successfully', deletedProduct, status: 201 });
        } catch (error) {
            console.error('Error deleting product:', error);
            return res.json({ message: 'Failed to delete product', status: 500 });
        }
    },

    deleteProductPermanent: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedProduct = await Product.findByIdAndDelete(id);
            if (!deletedProduct) {
                return res.json({ message: 'Product not found', status: 404 });
            }
            return res.json({ message: 'Product deleted successfully', deletedProduct, status: 201 });
        } catch (error) {
            console.error('Error deleting product:', error);
            return res.json({ message: 'Failed to delete product', status: 500 });
        }
    },

    restoreDeleteProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const restoredProduct = await Product.findByIdAndUpdate(id, { isdeleted: false }, { new: true });
            if (!restoredProduct) {
                return res.json({ message: 'Product not found', status: 404 });
            }
            return res.json({ message: 'Product restored successfully', restoredProduct, status: 201 });
        } catch (error) {
            console.error('Error restoring deleted product:', error);
            return res.json({ message: 'Failed to restore deleted product', status: 500 });
        }
    },
    getDeletedProduct: async (req, res) => {
        try {
            const deletedProducts = await Product.find({ isdeleted: true });
            if (!deletedProducts) {
                return res.json({ message: 'No deleted products found', status: 404 });
            }
            return res.json({ message: 'Deleted products retrieved successfully', deletedProducts, status: 201 });
        } catch (error) {
            console.error('Error getting deleted products:', error);
            return res.json({ message: 'Failed to get deleted products', status: 500 });
        }
    },

    // Delete specific image from product (thumbnail or gallery)
    deleteProductImage: async (req, res) => {
        try {
            const { id } = req.params;
            const { imageType, imageIndex, imagePath } = req.body;

            const product = await Product.findById(id);
            if (!product) {
                return res.json({ message: 'Product not found', status: 404 });
            }

            let updateQuery = {};

            if (imageType === 'thumbnail') {
                // Delete thumbnail image
                updateQuery = { thumbnail_image: null };
            } else if (imageType === 'gallery') {
                // Delete specific gallery image by index
                if (imageIndex !== undefined && imageIndex >= 0) {
                    const updatedGalleryImages = [...(product.Gallery_Images || [])];
                    updatedGalleryImages.splice(imageIndex, 1);
                    updateQuery = { Gallery_Images: updatedGalleryImages };
                } else if (imagePath) {
                    // Delete by path if index not provided
                    const updatedGalleryImages = (product.Gallery_Images || []).filter(
                        img => img.path !== imagePath && img.url !== imagePath
                    );
                    updateQuery = { Gallery_Images: updatedGalleryImages };
                } else {
                    return res.json({ message: 'Image index or path required for gallery deletion', status: 400 });
                }
            } else {
                return res.json({ message: 'Invalid image type. Use "thumbnail" or "gallery"', status: 400 });
            }

            const updatedProduct = await Product.findByIdAndUpdate(id, updateQuery, { new: true });

            return res.json({
                message: `${imageType} image deleted successfully`,
                product: updatedProduct,
                status: 200
            });
        } catch (error) {
            console.error('Error deleting product image:', error);
            return res.json({ message: 'Failed to delete product image', status: 500 });
        }
    },

    // Delete variant image from product
    deleteVariantImage: async (req, res) => {
        try {
            const { id } = req.params;
            const { optionSlug, imageIndex } = req.body;

            console.log('=== DELETE VARIANT IMAGE ===');
            console.log('Product ID:', id);
            console.log('Option Slug:', optionSlug);
            console.log('Image Index:', imageIndex);

            const product = await Product.findById(id).lean();
            if (!product) {
                return res.json({ message: 'Product not found', status: 404 });
            }

            // First, merge duplicate groups with same name and remove duplicate images
            const mergedGroups = {};
            (product.varImgGroup || []).forEach(group => {
                if (!mergedGroups[group.name]) {
                    mergedGroups[group.name] = {
                        name: group.name,
                        varImg: [],
                        _id: group._id
                    };
                }
                // Add unique images only (by url or path)
                (group.varImg || []).forEach(img => {
                    const exists = mergedGroups[group.name].varImg.some(
                        existing => existing.url === img.url || existing.path === img.path
                    );
                    if (!exists) {
                        mergedGroups[group.name].varImg.push(img);
                    }
                });
            });

            // Now delete the image at the specified index from the target group
            if (mergedGroups[optionSlug]) {
                const varImg = mergedGroups[optionSlug].varImg;
                if (imageIndex >= 0 && imageIndex < varImg.length) {
                    varImg.splice(imageIndex, 1);
                }
            }

            // Convert back to array
            const updatedVarImgGroup = Object.values(mergedGroups);

            // Update variantValues - remove image at index from matching variants
            const updatedVariantValues = (product.variantValues || []).map(variant => {
                if (variant.name && variant.name.includes(optionSlug)) {
                    const updatedImages = [...(variant.variantImages || [])];
                    if (imageIndex >= 0 && imageIndex < updatedImages.length) {
                        updatedImages.splice(imageIndex, 1);
                    }
                    return {
                        ...variant,
                        variantImages: updatedImages
                    };
                }
                return variant;
            });

            console.log('Cleaned & Updated varImgGroup:', JSON.stringify(updatedVarImgGroup, null, 2));

            const updatedProduct = await Product.findByIdAndUpdate(
                id,
                {
                    $set: {
                        varImgGroup: updatedVarImgGroup,
                        variantValues: updatedVariantValues
                    }
                },
                { new: true }
            );

            return res.json({
                message: 'Variant image deleted successfully',
                product: updatedProduct,
                status: 200
            });
        } catch (error) {
            console.error('Error deleting variant image:', error);
            return res.json({ message: 'Failed to delete variant image', status: 500 });
        }
    },

    statusProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            console.log(status);
            
            const updatedStatus = status === true ? true : false;

            const updatedProduct = await Product.findByIdAndUpdate(id, { status: status });
            console.log(updatedProduct)
            if (!updatedProduct) {
                return res.json({ error: 'Product not found', status: 404 });
            }
            return res.json({ message: 'Product status updated successfully', updatedProduct, status: 201 });
        } catch (error) {
            console.error('Error updating product status:', error);
            return res.json({ error: 'Failed to update product status', status: 500 });
        }
    },

    featureProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const { is_featured } = req.body;
            console.log(is_featured)
            const updatedProduct = await Product.findByIdAndUpdate(id, { is_featured: req.body.is_featured });
            console.log(updatedProduct)
            if (!updatedProduct) {
                return res.json({ error: 'Product not found', status: 404 });
            }
            return res.json({ message: 'Product featured updated successfully', updatedProduct, status: 201 });
        } catch (error) {
            console.error('Error updating product featured:', error);
            return res.json({ error: 'Failed to update product featured', status: 500 });
        }
    },

    dublicateProductImage: async (req, res) => {
        try {
            const { id } = req.params;

            // Step 1: Retrieve the product with the given ID
            const originalProduct = await Product.findById(id);
            if (!originalProduct) {
                return res.status(404).json({ message: 'Product not found', status: 404 });
            }

            // Step 2: Create a copy of the product with a new ID and modified name
            const productObject = originalProduct.toObject();

            // Generate a unique producturl by appending timestamp
            const timestamp = Date.now();
            const uniqueProductUrl = `${originalProduct.producturl}-copy-${timestamp}`;

            const copiedProduct = new Product({
                ...productObject,
                name: `${originalProduct.name} (Copy)`,
                producturl: uniqueProductUrl,
                _id: new mongoose.Types.ObjectId(),
                status: false // Set the status of the duplicated product to false
            });

            // Step 3: Modify the filenames for images before saving
            if (copiedProduct.thumbnail_image && copiedProduct.thumbnail_image.filename) {
                copiedProduct.thumbnail_image.filename += ' (copy)';
            }

            if (copiedProduct.Gallery_Images && Array.isArray(copiedProduct.Gallery_Images)) {
                copiedProduct.Gallery_Images.forEach(image => {
                    if (image && image.filename) {
                        image.filename += ' (copy)';
                    }
                });
            }

            // Step 4: Save the copied product
            const savedCopiedProduct = await copiedProduct.save();

            // Return the response with the duplicated product
            return res.status(201).json({ message: 'Product duplicated successfully', copiedProduct: savedCopiedProduct, status: 201 });
        } catch (error) {
            console.error('Error duplicating product:', error);
            return res.status(500).json({ message: 'Failed to duplicate product', error: error.message, status: 500 });
        }
    },
    getProductByName: async (req, res) => {
        try {
            const { productname } = req.params;
            console.log('=== GET PRODUCT BY ID ===');
            console.log('Product ID:', productname);

            // Try to find by ID first, then by name if that fails
            let product = null;

            // Check if it looks like a MongoDB ObjectId (24 hex chars)
            if (/^[0-9a-fA-F]{24}$/.test(productname)) {
                product = await Product.findById(productname);
                console.log("Searched by ID, found:", product ? 'Yes' : 'No');
            }

            // If not found by ID, try by name
            if (!product) {
                product = await Product.findOne({
                    name: { $regex: new RegExp(productname, 'i') }
                });
                console.log("Searched by name, found:", product ? 'Yes' : 'No');
            }

            if (!product) {
                return res.json({ message: 'Product not found', status: 404 });
            }

            return res.json({ message: 'Product retrieved', product, status: 201 });
        } catch (error) {
            console.error('Error getting product:', error.message);
            return res.json({ message: 'Failed to get product: ' + error.message, status: 500 });
        }
    },

    getProductBySlug: async (req, res) => {
        try {
            const { slug } = req.params;
            let product = await Product.findOne({ producturl: slug });

            if (!product) {
                const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                product = await Product.findOne({
                    producturl: { $regex: new RegExp(`^${escaped}(-\\d{13})?$`, 'i') }
                });
            }

            if (!product) {
                return res.json({ message: 'Product not found', status: 404 });
            }

            return res.json({ message: 'Product retrieved', product, status: 201 });
        } catch (error) {
            console.error('Error getting product by slug:', error);
            return res.json({ message: 'Failed to get product', status: 500 });
        }
    },

    getProductByproducturl: async (req, res) => {
        try {
            const { producturl } = req.body;
            
            console.log('[getProductByproducturl] Searching for:', producturl);

            // Try exact match first
            let product = await Product.findOne({ producturl });
            
            if (!product) {
                console.log('[getProductByproducturl] Exact match not found, trying case-insensitive...');
                product = await Product.findOne({ 
                    producturl: { $regex: new RegExp(`^${producturl}$`, 'i') }
                });
            }

            // Fallback: the incoming URL may have the timestamp stripped.
            // Match stored producturl that equals the slug + an optional 13-digit suffix.
            if (!product) {
                const escaped = producturl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                product = await Product.findOne({
                    producturl: { $regex: new RegExp(`^${escaped}(-\\d{13})?$`, 'i') }
                });
                if (product) {
                    console.log('[getProductByproducturl] Matched via timestamp-stripped fallback:', product.producturl);
                }
            }
            
            if (!product) {
                const similarProducts = await Product.find({ 
                    producturl: { $regex: new RegExp(producturl.split('-').slice(0, 3).join('-'), 'i') }
                }, { producturl: 1, name: 1 }).limit(5);
                
                console.log('[getProductByproducturl] Product not found. Similar products:', 
                    similarProducts.map(p => p.producturl));
                
                return res.json({ message: 'Product not found', status: 404 });
            }
            
            console.log('[getProductByproducturl] Found product:', product.name);

            // Fetch FAQs for this product from ProductFaq collection
            const ProductFaq = require('../models/productFaqs');
            const faqDetails = await ProductFaq.find({
                productId: product._id,
                status: 'Published'
            }).sort({ order: 1 });

            // Fetch Reviews for this product from ProductReview collection
            const ProductReview = require('../models/productReviews');
            const reviewDetails = await ProductReview.find({
                productId: product._id,
                status: 'Approved'
            }).sort({ createdAt: -1 });

            // Helper function to normalize slugs for comparison (handles both hyphen and underscore formats)
            const normalizeSlug = (s) => s ? s.toLowerCase().replace(/[-_]+/g, '-') : '';

            // Fetch topSectionItems with full data (icon, description) from VariantAttribute
            // Try both underscore and hyphen versions of slug for backwards compatibility
            const VariantAttribute = require('../models/VariantAttribute');
            let populatedTopSectionItems = [];
            if (product.topSectionItems && product.topSectionItems.length > 0) {
                const topSectionAttribute = await VariantAttribute.findOne({ 
                    $or: [{ slug: 'top_section' }, { slug: 'top-section' }]
                });
                if (topSectionAttribute && topSectionAttribute.values) {
                    populatedTopSectionItems = product.topSectionItems.map(slug => {
                        const normalizedProductSlug = normalizeSlug(slug);
                        const matchedValue = topSectionAttribute.values.find(v => normalizeSlug(v.slug) === normalizedProductSlug);
                        if (matchedValue) {
                            return {
                                slug: matchedValue.slug,
                                name: matchedValue.name,
                                icon: matchedValue.icon || null,
                                description: matchedValue.description || null,
                                image: matchedValue.image || null,
                                fromCatalog: true
                            };
                        }
                        // Fallback if slug not found in VariantAttribute
                        return {
                            slug: slug,
                            name: slug.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                            icon: null,
                            description: null,
                            image: null,
                            fromCatalog: false
                        };
                    });
                }
            }

            // Fetch comesWithItems with full data (icon, description) from VariantAttribute
            // Try both underscore and hyphen versions of slug for backwards compatibility
            let populatedComesWithItems = [];
            if (product.comesWithItems && product.comesWithItems.length > 0) {
                const comesWithAttribute = await VariantAttribute.findOne({ 
                    $or: [{ slug: 'comes_with' }, { slug: 'comes-with' }]
                });
                if (comesWithAttribute && comesWithAttribute.values) {
                    populatedComesWithItems = product.comesWithItems.map(slug => {
                        // Match using normalized slugs to handle underscore/hyphen inconsistencies
                        const normalizedProductSlug = normalizeSlug(slug);
                        const matchedValue = comesWithAttribute.values.find(v => normalizeSlug(v.slug) === normalizedProductSlug);
                        if (matchedValue) {
                            return {
                                slug: matchedValue.slug,
                                name: matchedValue.name,
                                icon: matchedValue.icon || null,
                                description: matchedValue.description || null,
                                image: matchedValue.image || null,
                                fromCatalog: true
                            };
                        }
                        // Fallback if slug not found in VariantAttribute
                        return {
                            slug: slug,
                            name: slug.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                            icon: null,
                            description: null,
                            image: null,
                            fromCatalog: false
                        };
                    });
                }
            }

            // Add faqDetails and reviewDetails to product response
            const productWithDetails = product.toObject();
            productWithDetails.faqDetails = faqDetails;
            productWithDetails.reviewDetails = reviewDetails;
            productWithDetails.topSectionItemsPopulated = populatedTopSectionItems;
            productWithDetails.comesWithItemsPopulated = populatedComesWithItems;

            // Log Comes With items
            if (populatedComesWithItems.length > 0) {
                console.log('\n=== Comes With Items ===');
                populatedComesWithItems.forEach(item => {
                    console.log(`- ${item.name}: ${item.description || 'No description'}`);
                });
                console.log('========================\n');
            }

            return res.json({ message: 'Product retrieved', product: productWithDetails, status: 201 });
        } catch (error) {
            console.error('Error getting product:', error);
            return res.json({ message: 'Failed to get product', status: 500 });
        }

    },

    getProductmetadataByproducturl: async (req, res) => {
        try {
            const { producturl } = req.params;
    
            let product = await Product.findOne({ producturl });
            if (!product) {
                const escaped = producturl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                product = await Product.findOne({
                    producturl: { $regex: new RegExp(`^${escaped}(-\\d{13})?$`, 'i') }
                });
            }
            if (!product) {
                return res.json({ message: 'Product not found', status: 404 });
            }
    
            // Extract necessary fields from the product
            const productMetaData = product.Seo_Meta || {};
            const { name, productType, rating, meta_Image, variantValues } = product;
    
            // Map over variantValues to get metadata
            const variantMetaDatas = variantValues.map(variant => ({
                metaImage: variant.metaImage,
                name: variant.name,
                metaTitle: variant.metaTitle,
                metaKeywords: variant.metaKeywords,
                metaDescription: variant.metaDescription,
                metaSchemas: variant.metaSchemas,
                _id: variant._id
            }));
    
            // Construct the response
            const response = {
                message: 'Product metadata retrieved',
                productMetaData: {
                    metaTitle: productMetaData.metaTitle || null,
                    metaDescription: productMetaData.metaDescription || null,
                    metaKeywords: productMetaData.metaKeywords || null,
                    metaSchemas: productMetaData.metaSchemas || []
                },
                name,
                productType,
                producturl,
                rating,
                meta_Image,
                variantMetaDatas,
                status: 201
            };
    
            return res.json(response);
        } catch (error) {
            console.error('Error getting product metadata:', error);
            return res.json({ message: 'Failed to get product metadata', status: 500 });
        }
    },
    
    getProductsHomepage: async (req, res) => {
        try {
            const products = await Product.aggregate([
                { $match: { status: true } },
                {
                    $project: {
                        name: 1,
                        thumbnail_image: 1,
                        is_featured: 1,
                        _id: 1,
                        minPrice: { $min: "$variantValues.Price" },
                        minSalePrice: { $min: "$variantValues.salePrice" },
                        averageRating: { $avg: "$reviewDetails.rating" },
                        condition: 1,
                        category: 1,
                        subCategory: 1,
                        producturl: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    },
                },
            ]);
    
            if (!products || products.length === 0) {
                return res.status(404).json({ message: 'Products not found' });
            }
    
            return res.status(201).json({ message: 'Products retrieved', products ,status : 201});
        } catch (error) {
            console.error('Error getting products:', error);
            return res.status(500).json({ message: 'Failed to get products' });
        }
    },

   
    getLatestProductsHomepage: async (req, res) => {
        try {
            const products = await Product.aggregate([
                { $match: { status: true } },
                // Add computed field for total stock across all variants
                {
                    $addFields: {
                        totalStock: {
                            $sum: {
                                $map: {
                                    input: { $ifNull: ["$variantValues", []] },
                                    as: "variant",
                                    in: { $ifNull: ["$$variant.Quantity", 0] }
                                }
                            }
                        }
                    }
                },
                // Filter out products with no stock (totalStock must be > 0)
                { $match: { totalStock: { $gt: 0 } } },
                { $sort: { createdAt: -1 } }, // Sort by createdAt in descending order
                { $limit: 10 }, // Limit the results to 10
                {
                    $project: {
                        name: 1,
                        thumbnail_image: 1,
                        is_featured: 1,
                        _id: 1,
                        minPrice: { $min: "$variantValues.Price" },
                        minSalePrice: { $min: "$variantValues.salePrice" },
                        averageRating: { $avg: "$reviewDetails.rating" },
                        condition: 1,
                        category: 1,
                        subCategory: 1,
                        producturl: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        totalStock: 1, // Include total stock in response
                    },
                },
            ]);

            if (!products || products.length === 0) {
                return res.status(404).json({ message: 'Products not found' });
            }

            return res.status(201).json({ message: 'Products retrieved', products, status: 201 });
        } catch (error) {
            console.error('Error getting products:', error);
            return res.status(500).json({ message: 'Failed to get products' });
        }
    },
    
    getFeatureProductsHomepage: async (req, res) => {
        try {
            const products = await Product.aggregate([
                { $match: { status: true, is_featured: true } }, // Match products where status and is_featured are true
                { $sort: { createdAt: -1 } }, // Sort by createdAt in descending order
                { $limit: 10 }, // Limit the results to 10 products
                {
                    $project: {
                        name: 1,
                        thumbnail_image: 1,
                        is_featured: 1,
                        _id: 1,
                        minPrice: { $min: "$variantValues.Price" },
                        minSalePrice: { $min: "$variantValues.salePrice" },
                        averageRating: { $avg: "$reviewDetails.rating" },
                        condition: 1,
                        category: 1,
                        subCategory: 1,
                        producturl: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    },
                },
            ]);
    
            return res.status(200).json({
                message: products.length ? 'Products retrieved' : 'No featured products',
                products: products || [],
                status: 200
            });
        } catch (error) {
            console.error('Error getting products:', error);
            return res.status(500).json({ message: 'Failed to get products' });
        }
    },


    getRefurbishedProductsHomepage: async (req, res) => {
        try {
            const products = await Product.aggregate([
                {
                    $match: {
                        $or: [{ condition: "Refurbished" }, { condition: "Brand New" }],
                        $expr: {
                            $regexMatch: {
                                input: { $toString: "$subCategory" },
                                regex: "iPhone",
                                options: "i"
                            }
                        }
                    }
                },
                { $sort: { createdAt: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        name: 1,
                        thumbnail_image: 1,
                        is_featured: 1,
                        _id: 1,
                        minPrice: { $min: "$variantValues.Price" },
                        minSalePrice: { $min: "$variantValues.salePrice" },
                        averageRating: { $avg: "$reviewDetails.rating" },
                        condition: 1,
                        category: 1,
                        subCategory: 1,
                        producturl: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    }
                }
            ]);

            if (!products || products.length === 0) {
                return res.status(404).json({ message: 'Products not found' });
            }

            return res.status(201).json({ message: 'Products retrieved', products, status: 201 });

        } catch (error) {
            console.error('Error getting products:', error);
            return res.status(500).json({ message: 'Failed to get products' });
        }
    },

    getTabletsAndIpadsHomepage: async (req, res) => {
        try {
            const products = await Product.aggregate([
                {
                    $match: {
                        status: true,
                        isdeleted: { $ne: true },
                        $or: [
                            {
                                // Apple iPads: category includes "Apple" AND subCategory includes "iPad"
                                $and: [
                                    { category: { $regex: /\bApple\b/i } },
                                    {
                                        $expr: {
                                            $regexMatch: {
                                                input: { $toString: "$subCategory" },
                                                regex: "iPad",
                                                options: "i"
                                            }
                                        }
                                    }
                                ]
                            },
                            {
                                // General Tablets: category includes "iPads-and-Tablets"
                                category: { $regex: /\biPads-and-Tablets\b/i }
                            }
                        ]
                    }
                },
                { $sort: { createdAt: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        name: 1,
                        thumbnail_image: 1,
                        is_featured: 1,
                        _id: 1,
                        minPrice: { $min: "$variantValues.Price" },
                        minSalePrice: { $min: "$variantValues.salePrice" },
                        averageRating: { $avg: "$reviewDetails.rating" },
                        condition: 1,
                        category: 1,
                        subCategory: 1,
                        producturl: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    }
                }
            ]);

            if (!products || products.length === 0) {
                return res.status(404).json({ message: 'Tablets & iPads not found' });
            }

            return res.status(201).json({
                message: 'Tablets & iPads retrieved successfully',
                products,
                status: 201,
                totalCount: products.length
            });

        } catch (error) {
            console.error('Error getting tablets & iPads:', error);
            return res.status(500).json({ message: 'Failed to get tablets & iPads' });
        }
    },

    getLaptopsAndMacbooksHomepage: async (req, res) => {
        try {
            const products = await Product.aggregate([
                {
                    $match: {
                        status: true,
                        isdeleted: { $ne: true },
                        is_featured: true, // Only featured products
                        category: { $regex: /\bLaptops\b/i }
                    }
                },
                { $sort: { createdAt: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        name: 1,
                        thumbnail_image: 1,
                        is_featured: 1,
                        _id: 1,
                        minPrice: { $min: "$variantValues.Price" },
                        minSalePrice: { $min: "$variantValues.salePrice" },
                        averageRating: { $avg: "$reviewDetails.rating" },
                        condition: 1,
                        category: 1,
                        subCategory: 1,
                        producturl: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    }
                }
            ]);

            if (!products || products.length === 0) {
                return res.status(404).json({ message: 'Laptops & Macbooks not found' });
            }

            return res.status(201).json({
                message: 'Laptops & Macbooks retrieved successfully',
                products,
                status: 201,
                totalCount: products.length
            });

        } catch (error) {
            console.error('Error getting laptops & macbooks:', error);
            return res.status(500).json({ message: 'Failed to get laptops & macbooks' });
        }
    },

    getProductsByCategoryname: async (req, res) => {
        try {
            const { categoryname } = req.params;
            console.log('Category query:', categoryname);

            // Fetch products by category name using aggregation
            const products = await Product.aggregate([
                {
                    $match: {
                        category: { $regex: new RegExp(categoryname, 'i') },
                        status: true,
                    },
                },
                {
                    $project: {
                        name: 1,
                        thumbnail_image: 1,
                        is_featured: 1,
                        _id: 1,
                        variantValues: {
                            $map: {
                                input: "$variantValues",
                                as: "variant",
                                in: {
                                    name: "$$variant.name",
                                    Price: "$$variant.Price",
                                    salePrice: "$$variant.salePrice",
                                    Quantity: "$$variant.Quantity",
                                    SKU: "$$variant.SKU"
                                }
                            }
                        },
                        minPrice: { $min: "$variantValues.Price" },
                        minSalePrice: { $min: "$variantValues.salePrice" },
                        averageRating: {
                            $cond: {
                                if: { $gt: [{ $size: { $ifNull: ["$reviewDetails", []] } }, 0] },
                                then: { $avg: { $ifNull: ["$reviewDetails.rating", []] } },
                                else: null,
                            },
                        },
                        condition: 1,
                        subCategory: 1,
                        category: 1,
                        producturl: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        totalVariants: { $size: { $ifNull: ["$variantValues", []] } },
                        availableVariants: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ["$variantValues", []] },
                                    as: "variant",
                                    cond: { $gt: [{ $ifNull: ["$$variant.Quantity", 0] }, 0] }
                                }
                            }
                        },
                        availabilityPercentage: {
                            $cond: {
                                if: { $gt: [{ $size: { $ifNull: ["$variantValues", []] } }, 0] },
                                then: {
                                    $multiply: [
                                        {
                                            $divide: [
                                                {
                                                    $size: {
                                                        $filter: {
                                                            input: { $ifNull: ["$variantValues", []] },
                                                            as: "variant",
                                                            cond: { $gt: [{ $ifNull: ["$$variant.Quantity", 0] }, 0] }
                                                        }
                                                    }
                                                },
                                                { $size: { $ifNull: ["$variantValues", []] } }
                                            ]
                                        },
                                        100
                                    ]
                                },
                                else: 0
                            }
                        }
                    },
                },
                {
                    $sort: { availabilityPercentage: -1, createdAt: -1 }
                },
            ]);

            console.log('Products found by category:', products);

            // If no products are found
            if (!products || products.length === 0) {
                return res.status(404).json({
                    message: 'No products found for this category',
                    status: 404,
                });
            }

            // Return the retrieved products in the API response
            return res.status(201).json({
                message: 'Products retrieved successfully',
                products,
                status: 201,
            });
        } catch (error) {
            console.error('Error getting products by category:', error);
            return res.status(500).json({ message: 'Failed to get products', status: 500 });
        }
    },
    

    getProductsBySubCategoryname: async (req, res) => {
        try {
            const { subcategoryname } = req.params;
            console.log('SubCategory Name:', subcategoryname);

            // Use aggregation for optimized querying and processing
            const products = await Product.aggregate([
                {
                    $match: {
                        subCategory: { $regex: new RegExp(subcategoryname, 'i') },
                        status: true,
                    },
                },
                {
                    $project: {
                        name: 1,
                        thumbnail_image: 1,
                        is_featured: 1,
                        _id: 1,
                        variantValues: {
                            $map: {
                                input: "$variantValues",
                                as: "variant",
                                in: {
                                    name: "$$variant.name",
                                    Price: "$$variant.Price",
                                    salePrice: "$$variant.salePrice",
                                    Quantity: "$$variant.Quantity",
                                    SKU: "$$variant.SKU"
                                }
                            }
                        },
                        minPrice: { $min: "$variantValues.Price" },
                        minSalePrice: { $min: "$variantValues.salePrice" },
                        averageRating: {
                            $cond: {
                                if: { $gt: [{ $size: { $ifNull: ["$reviewDetails", []] } }, 0] },
                                then: { $avg: { $ifNull: ["$reviewDetails.rating", []] } },
                                else: null,
                            },
                        },
                        condition: 1,
                        subCategory: 1,
                        category: 1,
                        producturl: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        totalVariants: { $size: { $ifNull: ["$variantValues", []] } },
                        availableVariants: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ["$variantValues", []] },
                                    as: "variant",
                                    cond: { $gt: [{ $ifNull: ["$$variant.Quantity", 0] }, 0] }
                                }
                            }
                        },
                        availabilityPercentage: {
                            $cond: {
                                if: { $gt: [{ $size: { $ifNull: ["$variantValues", []] } }, 0] },
                                then: {
                                    $multiply: [
                                        {
                                            $divide: [
                                                {
                                                    $size: {
                                                        $filter: {
                                                            input: { $ifNull: ["$variantValues", []] },
                                                            as: "variant",
                                                            cond: { $gt: [{ $ifNull: ["$$variant.Quantity", 0] }, 0] }
                                                        }
                                                    }
                                                },
                                                { $size: { $ifNull: ["$variantValues", []] } }
                                            ]
                                        },
                                        100
                                    ]
                                },
                                else: 0
                            }
                        }
                    },
                },
                {
                    $sort: { availabilityPercentage: -1, createdAt: -1 }
                },
            ]);

            console.log('Products found by subcategory name:', products);

            // If no products are found
            if (!products || products.length === 0) {
                return res.status(201).json({
                    message: 'No products found for this category',
                    products,
                    status: 201,
                });
            }

            // Return the processed products in the API response
            return res.status(201).json({
                message: 'Products retrieved successfully',
                products,
                status: 201,
            });
        } catch (error) {
            console.error('Error fetching category details:', error);
            return res.status(500).json({
                message: 'Failed to fetch category details',
                status: 500,
            });
        }
    },
    

    getProductsBySearch: async (req, res) => {
        try {
            const { searchname } = req.params;
            console.log('Search query:', searchname);

            // Validate search query - only proceed if searchname has actual content
            if (!searchname || searchname.trim() === '') {
                return res.status(400).json({
                    message: 'Search query is required',
                    products: [],
                    status: 400,
                });
            }

            // Use aggregation for optimized querying and processing
            const products = await Product.aggregate([
                {
                    $match: {
                        status: true,
                        $or: [
                            { name: { $regex: new RegExp(searchname, 'i') } },
                            { producturl: { $regex: new RegExp(searchname, 'i') } },
                            { category: { $regex: new RegExp(searchname, 'i') } },
                            { subCategory: { $regex: new RegExp(searchname, 'i') } }
                        ],
                    },
                },
                {
                    $project: {
                        name: 1,
                        thumbnail_image: 1,
                        is_featured: 1,
                        _id: 1,
                        variantValues: {
                            $map: {
                                input: "$variantValues",
                                as: "variant",
                                in: {
                                    name: "$$variant.name",
                                    Price: "$$variant.Price",
                                    salePrice: "$$variant.salePrice",
                                    Quantity: "$$variant.Quantity",
                                    SKU: "$$variant.SKU"
                                }
                            }
                        },
                        minPrice: { $min: "$variantValues.Price" },
                        minSalePrice: { $min: "$variantValues.salePrice" },
                        averageRating: {
                            $cond: {
                                if: { $gt: [{ $size: { $ifNull: ["$reviewDetails", []] } }, 0] },
                                then: { $avg: { $ifNull: ["$reviewDetails.rating", []] } },
                                else: null,
                            },
                        },
                        condition: 1,
                        subCategory: 1,
                        category: 1,
                        producturl: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        totalVariants: { $size: { $ifNull: ["$variantValues", []] } },
                        availableVariants: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ["$variantValues", []] },
                                    as: "variant",
                                    cond: { $gt: [{ $ifNull: ["$$variant.Quantity", 0] }, 0] }
                                }
                            }
                        },
                        isAccessory: {
                            $cond: {
                                if: { $regexMatch: { input: "$category", regex: /accessories/i } },
                                then: 1,
                                else: 0
                            }
                        },
                        availabilityPercentage: {
                            $cond: {
                                if: { $gt: [{ $size: { $ifNull: ["$variantValues", []] } }, 0] },
                                then: {
                                    $multiply: [
                                        {
                                            $divide: [
                                                {
                                                    $size: {
                                                        $filter: {
                                                            input: { $ifNull: ["$variantValues", []] },
                                                            as: "variant",
                                                            cond: { $gt: [{ $ifNull: ["$$variant.Quantity", 0] }, 0] }
                                                        }
                                                    }
                                                },
                                                { $size: { $ifNull: ["$variantValues", []] } }
                                            ]
                                        },
                                        100
                                    ]
                                },
                                else: 0
                            }
                        }
                    },
                },
                {
                    $sort: { isAccessory: 1, availabilityPercentage: -1, createdAt: -1 }
                },
            ]);

            console.log('Products found by search:', products);

            // If no products are found
            if (!products || products.length === 0) {
                return res.status(404).json({
                    message: 'No products found for this search query',
                    status: 404,
                });
            }

            // Return the processed products in the API response
            return res.status(201).json({
                message: 'Products retrieved successfully',
                products,
                status: 201,
            });
        } catch (error) {
            console.error('Error fetching products by search:', error);
            return res.status(500).json({
                message: 'Failed to fetch products',
                status: 500,
            });
        }
    },
    
    

    updateStatusProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
    
            // Update the status to true or false based on the incoming status value
            const updatedStatus = status === true ? true : false;
    
            // Find the product and update its status
            const product = await Product.findByIdAndUpdate(id, { status: updatedStatus }, { new: true });
    
            // If the product is not found
            if (!product) {
                return res.json({ message: 'Product not found', status: 404 });
            }
    
            // Return success message with the updated product
            return res.json({ message: 'Product status updated successfully', product, status: 200 });
        } catch (error) {
            console.error('Error updating product status:', error);
            return res.json({ error: 'Failed to update product status', status: 500 });
        }
    },

    getAllActiveProductForSidebar: async (req, res) => {
        try {
            const products = await Product.find({ status: true });
            return res.json({ message: 'Products retrieved', products, status: 201 });
        } catch (error) {
            console.error('Error fetching products:', error);
            return res.json({ error: 'Failed to fetch products', status: 500 });
        }
    },
    getAllActiveProductForAdminPanel: async (req, res) => {
        try {
            // const products = await Product.find();
            const products = await Product.find({ status: 'true' });
            if (!products) {
                return res.json({ message: 'Products not found', status: 404 });
            }

            return res.json({ message: 'Products retrieved', products, status: 201 });
        } catch (error) {
            console.error('Error getting products:', error);
            return res.json({ message: 'Failed to get products', status: 500 });
        }

    },

    getProductsAdminpage: async (req, res) => {
        try {
            // Validate and parse query parameters
            const batchSize = Math.max(parseInt(req.query.batchSize), 1) || 20; // Default batch size of 20
            const skipCount = Math.max(parseInt(req.query.skip), 0) || 0;       // Default skip count of 0
            const brandFilter = req.query.brand; // Get brand filter from query parameters
        
            // Build filter query
            let filterQuery = { status: true };
            
            // Add brand filter if provided
            if (brandFilter) {
                filterQuery.brand = brandFilter;
            }
        
            // Fetch products and count in parallel for better performance
            const [products, totalProductsCount] = await Promise.all([
              Product.find(filterQuery)
                .select('-Seo_Meta -comes_With -Product_description -meta_Image -reviewDetails -rating -product_Specifications -variantDescription -is_refundable -has_warranty -battery -tags -seeAccessoriesWeDontNeed -is_authenticated -low_stock_quantity_alert -sim_options -variantNames -varImgGroup') 
                .sort({ createdAt: -1 })   
                .skip(skipCount)
                .limit(batchSize),
              Product.countDocuments(filterQuery)
            ]);
        
            // Send response with status code 200
            res.status(201).json({
              message: `Batch of products retrieved${brandFilter ? ` for brand: ${brandFilter}` : ''}`,
              products,
              totalProductsCount,
              status: 201,
            });
          } catch (error) {
            console.error('Error getting products:', error.message);
            res.status(500).json({ message: 'Failed to get products', status: 500 });
          }
    },
    


    
    getProductsAdminpagev2: async (req, res) => {
        try {
            const { searchname } = req.query;
            console.log('Search query:', searchname);

            // Build filter query
            let filterQuery = { status: true };

            // Add search filter if searchname is provided
            if (searchname && searchname.trim() !== '') {
                filterQuery.$or = [
                    { name: { $regex: new RegExp(searchname, 'i') } },
                    { producturl: { $regex: new RegExp(searchname, 'i') } },
                    { category: { $regex: new RegExp(searchname, 'i') } },
                    { subCategory: { $regex: new RegExp(searchname, 'i') } }
                ];
            }

            // Fetch products and count in parallel for better performance
            const [productsData, totalProductsCount] = await Promise.all([
              Product.find(filterQuery)
                .select('-Seo_Meta -comes_With -Product_description -meta_Image -reviewDetails -rating -product_Specifications -variantDescription -is_refundable -has_warranty -battery -tags -seeAccessoriesWeDontNeed -is_authenticated -low_stock_quantity_alert -sim_options -variantNames -varImgGroup -Product_summary')
                .sort({ createdAt: -1 })
                .lean(),
              Product.countDocuments(filterQuery)
            ]);

            // Modify Gallery_Images and variantValues for each product
            const products = productsData.map(product => {
              // Only include the first gallery image
              if (product.Gallery_Images && product.Gallery_Images.length > 0) {
                product.Gallery_Images = [product.Gallery_Images[0]];
              }

              // Handle variantValues based on productType
              if (product.productType) {
                if (product.productType.type === 'single') {
                  // For single products, only include Price and salePrice from variantValues
                  if (product.variantValues && product.variantValues.length > 0) {
                    product.variantValues = product.variantValues.map(variant => ({
                      Price: variant.Price,
                      salePrice: variant.salePrice
                    }));
                  } else {
                    // Remove variantValues if empty
                    delete product.variantValues;
                  }
                } else if (product.productType.type === 'variant') {
                  // For variant products, remove variantValues completely
                  delete product.variantValues;
                }
              }

              return product;
            });

            // Send response with status code 200
            res.status(201).json({
              message: searchname ? `Products retrieved for search: ${searchname}` : 'Products retrieved',
              products,
              totalProductsCount,
              status: 201,
            });
          } catch (error) {
            console.error('Error getting products:', error.message);
            res.status(500).json({ message: 'Failed to get products', status: 500 });
          }
    },


    // getProductsAdminpage: async (req, res) => {
    //     try {
    //         const batchSize = parseInt(req.query.batchSize) || 20; // Default batch size
    //         const skipCount = parseInt(req.query.skip) || 0; // Number of products to skip
    
    //         const products = await Product.find({ status: 'true' })
    //             .sort({ createdAt: -1 })
    //             .skip(skipCount)
    //             .limit(batchSize);
    
    //         const totalProductsCount = await Product.countDocuments({ status: 'true' });
    
    //         res.status(200).json({
    //             message: 'Batch of products retrieved',
    //             products,
    //             totalProductsCount,
    //             status: 201,
    //         });
    //     } catch (error) {
    //         console.error('Error getting products:', error);
    //         res.status(500).json({ message: 'Failed to get products', status: 500 });
    //     }
    // },      

    getProductsHomepageCustomized: async (req, res) => {
        try {
            const batchSize = parseInt(req.query.batchSize) || 20; // Default batch size
            const skipCount = parseInt(req.query.skip) || 0; // Number of products to skip
    
            const products = await Product.find({ status: 'true' })
                .sort({ createdAt: -1 })
                .skip(skipCount)
                .limit(batchSize);
    
            const totalProductsCount = await Product.countDocuments({ status: 'true' });
    
            res.status(200).json({
                message: 'Batch of products retrieved',
                products,
                totalProductsCount,
                status: 201,
            });
        } catch (error) {
            console.error('Error getting products:', error);
            res.status(500).json({ message: 'Failed to get products', status: 500 });
        }
    },
    getProductsAdminpageforcsv: async (req, res) => {
        try {
            // Define the fields to return
            const selectedFields = {
                Gallery_Images: 1,
                Product_summary: 1,
                is_featured: 1,
                brand: 1,
                category: 1,
                condition: 1,
                createdAt: 1,
                name: 1,
                productType: 1,
                producturl: 1,
                status: 1,
                subCategory: 1,
                thumbnail_image: 1,
                updatedAt: 1,
                variantValues: 1,
                _id: 1
            };
    
            // Fetch all products where status is 'true' and select required fields
            const products = await Product.find({ status: 'true' }).select(selectedFields).sort({ createdAt: -1 });
    
            const totalProductsCount = products.length; // Count all retrieved products
    
            res.status(200).json({
                message: 'All products retrieved',
                products,
                totalProductsCount,
                status: 201,
            });
        } catch (error) {
            console.error('Error getting products:', error);
            res.status(500).json({ message: 'Failed to get products', status: 500 });
        }
    },
    
    getAllActiveProductForBlog: async (req, res) => {
            try {
                const products = await Product.aggregate([
                    { $match: { status: true } },
                    {
                        $project: {
                            name: 1,
                            thumbnail_image: 1,
                            is_featured: 1,
                            _id: 1,
                            minPrice: { $min: "$variantValues.Price" },
                            minSalePrice: { $min: "$variantValues.salePrice" },
                            averageRating: { $avg: "$reviewDetails.rating" },
                            condition: 1,
                            category: 1,
                            subCategory: 1,
                            producturl: 1,
                            createdAt: 1,
                            updatedAt: 1,
                        },
                    },
                ]);

                if (!products || products.length === 0) {
                    return res.status(404).json({ message: 'Products not found' });
                }

                return res.status(201).json({ message: 'Products retrieved', products ,status : 201});
            } catch (error) {
                console.error('Error getting products:', error);
                return res.status(500).json({ message: 'Failed to get products' });
            }
        },

    // Optimized endpoint for navbar search suggestions
    getNavbarSuggestions: async (req, res) => {
        try {
            const { q } = req.query; 

            // Validate search query
            if (!q || q.trim().length < 2) {
                return res.status(200).json({
                    message: 'Search query too short',
                    suggestions: [],
                    status: 200
                });
            }

            const searchTerm = q.trim().toLowerCase();
            const limit = parseInt(req.query.limit) || 5; // Default to 5 suggestions

            // Build search query with case-insensitive regex
            const searchQuery = {
                status: true, // Only active products
                category: { $not: /accessories/i }, // Exclude products with "Accessories" in category
                $or: [
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { producturl: { $regex: searchTerm, $options: 'i' } },
                    { condition: { $regex: searchTerm, $options: 'i' } },
                    { brand: { $regex: searchTerm, $options: 'i' } },
                    { subCategory: { $regex: searchTerm, $options: 'i' } }
                ]
            };

            // Fetch minimal fields for suggestions
            const suggestions = await Product.find(searchQuery)
                .select('name producturl condition category brand subCategory _id')
                .limit(limit)
                .lean(); // Use lean() for better performance

            return res.status(200).json({
                message: 'Suggestions retrieved',
                suggestions,
                count: suggestions.length,
                status: 200
            });

        } catch (error) {
            console.error('Error getting navbar suggestions:', error);
            return res.status(500).json({
                message: 'Failed to get suggestions',
                suggestions: [],
                status: 500
            });
        }
    },

    getVariantValuesByProductId: async (req, res) => {
        try {
            const { id } = req.params;

            // Validate product ID
            if (!id) {
                return res.status(400).json({
                    message: 'Product ID is required',
                    status: 400
                });
            }

            // Find product and return only variantValues
            const product = await Product.findById(id).select('variantValues name producturl');

            if (!product) {
                return res.status(404).json({
                    message: 'Product not found',
                    status: 404
                });
            }

            return res.status(200).json({
                message: 'Variant values retrieved successfully',
                productId: product._id,
                productName: product.name,
                productUrl: product.producturl,
                variantValues: product.variantValues || [],
                status: 200
            });

        } catch (error) {
            console.error('Error getting variant values:', error);
            return res.status(500).json({
                message: 'Failed to get variant values',
                status: 500
            });
        }
    },

     getNewProductsAdminpage: async (req, res) => {
        try {
            // Validate and parse query parameters
            const batchSize = Math.max(parseInt(req.query.batchSize), 1) || 20; // Default batch size of 20
            const skipCount = Math.max(parseInt(req.query.skip), 0) || 0;       // Default skip count of 0
            const brandFilter = req.query.brand; // Get brand filter from query parameters

            // Build filter query
            let filterQuery = { isdeleted: { $ne: true } };

            // Add brand filter if provided (case-insensitive)
            if (brandFilter) {
                filterQuery.brand = { $regex: new RegExp(`^${brandFilter}$`, 'i') };
            }

            // Fetch products and count in parallel for better performance
            // Use explicit field selection (faster than exclusion)
            const [productsData, totalProductsCount] = await Promise.all([
              Product.find(filterQuery)
                .select('_id name producturl category subCategory brand condition is_featured status productType variantValues thumbnail_image Gallery_Images createdAt updatedAt')
                .sort({ createdAt: -1 })
                .skip(skipCount)
                .limit(batchSize)
                .lean(), // Use lean() for better performance
              Product.countDocuments(filterQuery)
            ]);

            // Optimize product processing
            const products = productsData.map(product => {
              // Only include the first gallery image if it exists
              if (product.Gallery_Images?.length > 0) {
                product.Gallery_Images = [product.Gallery_Images[0]];
              }

              // Calculate variant count and process variantValues
              const variantCount = product.variantValues?.length || 0;
              const productType = product.productType;

              if (productType) {
                // Add variant count to productType
                productType.variantCount = variantCount;

                // Process based on product type
                if (productType.type === 'single' && variantCount > 0) {
                  // For single products, only include Price and salePrice
                  product.variantValues = product.variantValues.map(v => ({
                    Price: v.Price,
                    salePrice: v.salePrice
                  }));
                } else {
                  // For variant products or empty variantValues, remove completely
                  delete product.variantValues;
                }
              }

              return product;
            });

            // Send response with status code 200
            res.status(201).json({
              message: `Batch of products retrieved${brandFilter ? ` for brand: ${brandFilter}` : ''}`,
              products,
              totalProductsCount,
              status: 201,
            });
          } catch (error) {
            console.error('Error getting products:', error.message);
            res.status(500).json({ message: 'Failed to get products', status: 500 });
          }
    },
    getVariantValuesBynewProductId: async (req, res) => {
        try {
            const { id } = req.params;

            // Validate product ID
            if (!id) {
                return res.status(400).json({
                    message: 'Product ID is required',
                    status: 400
                });
            }

            // Find product and return only variantValues
            const product = await Product.findById(id).select('variantValues name producturl').lean();

            if (!product) {
                return res.status(404).json({
                    message: 'Product not found',
                    status: 404
                });
            }

            // Process variantValues to exclude meta fields
            const cleanedVariants = product.variantValues?.map(variant => {
                const { metaDescription, metaSchemas, metaKeywords, metaTitle, metaImage, ...cleanVariant } = variant;
                return cleanVariant;
            }) || [];

            return res.status(200).json({
                message: 'Variant values retrieved successfully',
                productId: product._id,
                productName: product.name,
                productUrl: product.producturl,
                variantValues: cleanedVariants,
                status: 200
            });

        } catch (error) {
            console.error('Error getting variant values:', error);
            return res.status(500).json({
                message: 'Failed to get variant values',
                status: 500
            });
        }
    },

    // Get Product Central Stats (counts for categories, subcategories, tags)
    getProductCentralStats: async (req, res) => {
        try {
            const ProductCategory = require('../models/productCategories');
            const ProductTag = require('../models/productTags');
            const CategoryDisplayProducts = require('../models/categoryDisplayProducts');

            // Fetch all counts in parallel
            const [
                categories,
                tags,
                displayProducts
            ] = await Promise.all([
                ProductCategory.find().lean(),
                ProductTag.countDocuments(),
                CategoryDisplayProducts.find().lean()
            ]);

            // Calculate subcategories count
            let subcategoriesCount = 0;
            categories.forEach(cat => {
                if (cat.subCategory && Array.isArray(cat.subCategory)) {
                    subcategoriesCount += cat.subCategory.length;
                }
            });

            // Calculate total display products
            let totalDisplayProducts = 0;
            displayProducts.forEach(doc => {
                if (doc.products && Array.isArray(doc.products)) {
                    totalDisplayProducts += doc.products.length;
                }
            });

            // Get published vs unpublished counts
            const publishedCategories = categories.filter(c => c.isPublish).length;
            const publishedTags = await ProductTag.countDocuments({ isPublished: true });

            res.status(200).json({
                message: 'Product central stats retrieved successfully',
                stats: {
                    categories: {
                        total: categories.length,
                        published: publishedCategories,
                        unpublished: categories.length - publishedCategories
                    },
                    subcategories: {
                        total: subcategoriesCount
                    },
                    tags: {
                        total: tags,
                        published: publishedTags,
                        unpublished: tags - publishedTags
                    },
                    displayProducts: {
                        total: totalDisplayProducts,
                        categories: displayProducts.length
                    }
                },
                status: 200
            });
        } catch (error) {
            console.error('Error getting product central stats:', error.message);
            res.status(500).json({ message: 'Failed to get product central stats', status: 500 });
        }
    },

    // Search products by category for frontend display selection
    searchProductsByCategory: async (req, res) => {
        try {
            const { searchname, category, page = 1, limit = 20 } = req.query;
            console.log('Search query:', searchname, 'Category:', category, 'Page:', page, 'Limit:', limit);

            // Validate category parameter
            if (!category || category.trim() === '') {
                return res.status(400).json({
                    message: 'Category is required',
                    products: [],
                    status: 400,
                });
            }

            // Parse pagination parameters
            const pageNum = Math.max(parseInt(page), 1);
            const limitNum = Math.min(Math.max(parseInt(limit), 1), 100); // Max 100 per page
            const skipCount = (pageNum - 1) * limitNum;

            // Build filter query - filter by category
            let filterQuery = {
                status: true,
                category: { $regex: new RegExp(category, 'i') }
            };

            // Add search filter if searchname is provided
            if (searchname && searchname.trim() !== '') {
                filterQuery.$and = [
                    { category: { $regex: new RegExp(category, 'i') } },
                    {
                        $or: [
                            { name: { $regex: new RegExp(searchname, 'i') } },
                            { producturl: { $regex: new RegExp(searchname, 'i') } },
                            { subCategory: { $regex: new RegExp(searchname, 'i') } }
                        ]
                    }
                ];
                // Remove the top-level category filter since it's in $and
                delete filterQuery.category;
            }

            // Fetch products and total count in parallel
            const [products, totalCount] = await Promise.all([
                Product.find(filterQuery)
                    .select('_id name producturl category subCategory brand condition thumbnail_image variantValues productType')
                    .sort({ createdAt: -1 })
                    .skip(skipCount)
                    .limit(limitNum)
                    .lean(),
                Product.countDocuments(filterQuery)
            ]);

            // Process products to include only necessary variant info and stock information
            const processedProducts = products.map(product => {
                let minPrice = null;
                let minSalePrice = null;
                let totalStock = 0;
                let totalVariants = 0;
                let variantsInStock = 0;
                let variantsOutOfStock = 0;
                let variantStocks = [];

                if (product.variantValues && product.variantValues.length > 0) {
                    const prices = product.variantValues.map(v => v.Price).filter(p => p != null);
                    const salePrices = product.variantValues.map(v => v.salePrice).filter(p => p != null);

                    if (prices.length > 0) minPrice = Math.min(...prices);
                    if (salePrices.length > 0) minSalePrice = Math.min(...salePrices);

                    // Calculate stock information
                    totalVariants = product.variantValues.length;
                    product.variantValues.forEach(variant => {
                        const qty = variant.Quantity || 0;
                        totalStock += qty;
                        if (qty > 0) {
                            variantsInStock++;
                        } else {
                            variantsOutOfStock++;
                        }
                        // Include individual variant stock info
                        variantStocks.push({
                            _id: variant._id,
                            name: variant.name,
                            SKU: variant.SKU,
                            quantity: qty,
                            inStock: qty > 0
                        });
                    });
                }

                // Determine overall stock status
                let stockStatus = 'out_of_stock';
                if (totalStock > 0) {
                    if (variantsOutOfStock === 0) {
                        stockStatus = 'in_stock';
                    } else {
                        stockStatus = 'partial_stock';
                    }
                }

                return {
                    _id: product._id,
                    name: product.name,
                    producturl: product.producturl,
                    category: product.category,
                    subCategory: product.subCategory,
                    brand: product.brand,
                    condition: product.condition,
                    thumbnail_image: product.thumbnail_image,
                    minPrice,
                    minSalePrice,
                    productType: product.productType?.type || 'single',
                    // Stock information
                    stock: {
                        totalStock,
                        totalVariants,
                        variantsInStock,
                        variantsOutOfStock,
                        stockStatus,
                        variants: variantStocks
                    }
                };
            });

            // Calculate pagination info
            const totalPages = Math.ceil(totalCount / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;

            // Send response
            res.status(200).json({
                message: searchname ? `Products retrieved for search: ${searchname} in category: ${category}` : `Products retrieved for category: ${category}`,
                products: processedProducts,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalCount,
                    limit: limitNum,
                    hasNextPage,
                    hasPrevPage
                },
                status: 200,
            });
        } catch (error) {
            console.error('Error searching products by category:', error.message);
            res.status(500).json({ message: 'Failed to search products', status: 500 });
        }
    },

    // Check stock availability for a product or variant
    checkStockAvailability: async (req, res) => {
        try {
            const { productId, variantId } = req.body;

            // Validate required fields
            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID is required',
                    status: 400
                });
            }

            // Find the product
            const product = await Product.findById(productId).select('name variantValues Quantity productType');

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found',
                    status: 404
                });
            }

            let availableQuantity = 0;
            let stockStatus = 'in_stock';
            let productInfo = {
                productId: product._id,
                productName: product.name
            };

            // Check if product has variants
            const hasVariants = product.variantValues && product.variantValues.length > 0;

            if (hasVariants) {
                // Product has variants
                if (variantId) {
                    // Find specific variant by ID
                    const variant = product.variantValues.find(v =>
                        v._id && v._id.toString() === variantId.toString()
                    );

                    if (!variant) {
                        return res.status(404).json({
                            success: false,
                            message: 'Variant not found',
                            status: 404
                        });
                    }

                    availableQuantity = variant.Quantity || 0;
                    productInfo.variantId = variant._id;
                    productInfo.variantName = variant.name;
                    productInfo.variantSKU = variant.SKU;

                    // Check variant status
                    if (!variant.status || availableQuantity === 0) {
                        stockStatus = 'out_of_stock';
                    } else if (availableQuantity <= 5) {
                        stockStatus = 'low_stock';
                    }
                } else {
                    // No variant ID provided, check if single-variant product
                    if (product.variantValues.length === 1) {
                        const variant = product.variantValues[0];
                        availableQuantity = variant.Quantity || 0;
                        productInfo.variantId = variant._id;
                        productInfo.variantName = variant.name;
                        productInfo.variantSKU = variant.SKU;

                        if (!variant.status || availableQuantity === 0) {
                            stockStatus = 'out_of_stock';
                        } else if (availableQuantity <= 5) {
                            stockStatus = 'low_stock';
                        }
                    } else {
                        return res.status(400).json({
                            success: false,
                            message: 'Variant ID is required for multi-variant products',
                            status: 400
                        });
                    }
                }
            } else {
                // Single product without variants
                availableQuantity = product.Quantity || 0;

                if (!product.status || availableQuantity === 0) {
                    stockStatus = 'out_of_stock';
                } else if (availableQuantity <= 5) {
                    stockStatus = 'low_stock';
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Stock availability retrieved successfully',
                data: {
                    ...productInfo,
                    availableQuantity,
                    stockStatus,
                    inStock: availableQuantity > 0
                },
                status: 200
            });

        } catch (error) {
            console.error('Error checking stock availability:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to check stock availability',
                error: error.message,
                status: 500
            });
        }
    },

    /** Public: curated product sliders on homepage / blog blocks (ids only, active products, max 40). */
    getProductsByIdsPublic: async (req, res) => {
        try {
            const raw = req.query.ids;
            if (!raw || typeof raw !== 'string') {
                return res.status(400).json({
                    message: 'Query parameter ids is required (comma-separated MongoDB ids)',
                    products: [],
                    status: 400,
                });
            }

            const idStrings = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 40);
            const validIds = idStrings.filter((id) => mongoose.Types.ObjectId.isValid(id));
            if (validIds.length === 0) {
                return res.status(200).json({
                    message: 'No valid product ids',
                    products: [],
                    status: 200,
                });
            }

            const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));
            const found = await Product.find({
                _id: { $in: objectIds },
                status: true,
            })
                .select('_id name producturl category subCategory brand condition thumbnail_image variantValues reviewDetails')
                .lean();

            const formatCard = (fullProduct) => {
                let minPrice = null;
                let minSalePrice = null;
                let hasStock = false;
                if (fullProduct.variantValues && fullProduct.variantValues.length > 0) {
                    const prices = fullProduct.variantValues.map((v) => v.Price).filter((p) => p != null);
                    const salePrices = fullProduct.variantValues.map((v) => v.salePrice).filter((p) => p != null);
                    if (prices.length > 0) minPrice = Math.min(...prices);
                    if (salePrices.length > 0) minSalePrice = Math.min(...salePrices);
                    hasStock = fullProduct.variantValues.some((v) => (v.Quantity || 0) > 0);
                }
                let averageRating = null;
                if (fullProduct.reviewDetails && fullProduct.reviewDetails.length > 0) {
                    const ratings = fullProduct.reviewDetails.map((r) => r.rating).filter((n) => n != null);
                    if (ratings.length > 0) {
                        averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                    }
                }
                return {
                    _id: fullProduct._id,
                    name: fullProduct.name,
                    producturl: fullProduct.producturl,
                    category: fullProduct.category,
                    subCategory: fullProduct.subCategory,
                    brand: fullProduct.brand,
                    condition: fullProduct.condition,
                    thumbnail_image: fullProduct.thumbnail_image,
                    minPrice: minPrice != null ? minPrice : 0,
                    minSalePrice: minSalePrice != null ? minSalePrice : 0,
                    averageRating,
                    hasStock,
                };
            };

            const byId = new Map(found.map((p) => [p._id.toString(), p]));
            const ordered = [];
            for (const idStr of validIds) {
                const p = byId.get(idStr);
                if (p) ordered.push(formatCard(p));
            }

            return res.status(200).json({
                message: 'Products retrieved',
                products: ordered,
                status: 200,
            });
        } catch (error) {
            console.error('Error getProductsByIdsPublic:', error);
            return res.status(500).json({
                message: 'Failed to fetch products',
                products: [],
                status: 500,
            });
        }
    },
};

module.exports = adminProductController