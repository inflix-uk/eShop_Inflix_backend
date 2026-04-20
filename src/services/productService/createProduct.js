// services/productService/createProduct.js
const Product = require('../../models/product');
const blobStorage = require('../../utils/blobStorage');
const { toSeoSlug, generateVariantId, generateVariantSlug, variantNameToSeoSlug } = require('../../utils/slugUtils');

/**
 * Create Product Service
 * Handles all business logic for creating a new product
 */
class CreateProductService {
    /**
     * Generate a URL-friendly slug from text (SEO-friendly hyphen format)
     * @param {string} text - The text to convert to slug
     * @returns {string} - The generated slug
     */
    generateSlug(text) {
        if (!text) return '';
        return toSeoSlug(text);
    }

    /**
     * Generate product URL slug from product name
     * @param {string} name - The product name
     * @returns {string} - The generated slug (clean, no timestamp)
     */
    generateProductUrl(name) {
        if (!name) return null;
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Process dynamic variant attributes from frontend
     * @param {Array} variantNamesData - Array of variant name objects from frontend
     * @returns {Array} - Processed variant names array
     */
    processVariantAttributes(variantNamesData) {
        return variantNamesData.map(variant => ({
            name: variant.name,
            attributeId: variant.attributeId || null,
            attributeSlug: variant.attributeSlug || this.generateSlug(variant.name),
            hasModels: variant.hasModels || false,
            options: (variant.options || []).map(opt => ({
                value: opt.value || opt.option || opt.name,
                slug: opt.slug || this.generateSlug(opt.value || opt.option || opt.name),
                colorCode: opt.colorCode || null,
                model: opt.model ? {
                    name: opt.model.name,
                    slug: opt.model.slug || this.generateSlug(opt.model.name)
                } : null
            }))
        }));
    }

    /**
     * Parse variant name to structured attributes
     * @param {string} variantName - The variant name (e.g., "Red-iPhone 15 Pro-128GB")
     * @param {Array} variantNamesArray - Array of variant definitions
     * @returns {Array} - Array of structured attribute objects
     */
    parseVariantNameToAttributes(variantName, variantNamesArray) {
        const parts = variantName.split('-');
        return variantNamesArray.map((variantDef, index) => {
            const part = parts[index] || '';
            const matchingOption = variantDef.options.find(
                opt => opt.value === part || opt.slug === this.generateSlug(part)
            );
            return {
                attributeName: variantDef.name,
                attributeSlug: variantDef.attributeSlug,
                value: part,
                valueSlug: matchingOption?.slug || this.generateSlug(part),
                colorCode: matchingOption?.colorCode || null,
                model: matchingOption?.model || null
            };
        });
    }

    /**
     * Process comesWithItems array (array of slugs from VariantAttribute system)
     */
    processComesWithItems(comesWithItems) {
        if (!comesWithItems || comesWithItems === 'undefined' || comesWithItems === 'null') return [];
        try {
            const parsed = JSON.parse(comesWithItems);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Error parsing comesWithItems:', error);
            return [];
        }
    }

    /**
     * Process specifications
     */
    processSpecifications(specifications) {
        if (!specifications || specifications === 'undefined' || specifications === 'null') return [];
        try {
            return JSON.parse(specifications);
        } catch (error) {
            console.error('Error parsing specifications:', error);
            return [];
        }
    }

    /**
     * Process refundable values
     */
    processRefundableValues(is_refundable) {
        if (!is_refundable || is_refundable === 'undefined' || is_refundable === 'null') return [];
        try {
            return JSON.parse(is_refundable);
        } catch (error) {
            console.error('Error parsing is_refundable:', error);
            return [];
        }
    }

    /**
     * Process warranty values
     */
    processWarrantyValues(has_warranty) {
        if (!has_warranty || has_warranty === 'undefined' || has_warranty === 'null') return [];
        try {
            return JSON.parse(has_warranty);
        } catch (error) {
            console.error('Error parsing has_warranty:', error);
            return [];
        }
    }

    /**
     * Process product type values
     */
    processProductTypeValues(productType) {
        if (!productType || productType === 'undefined' || productType === 'null') return [];
        try {
            return JSON.parse(productType);
        } catch (error) {
            console.error('Error parsing productType:', error);
            return [];
        }
    }

    /**
     * Process variant descriptions
     */
    processVariantDescriptions(variantDesc) {
        if (!variantDesc || variantDesc === 'undefined' || variantDesc === 'null') return [];
        try {
            return JSON.parse(variantDesc) || [];
        } catch (error) {
            console.error('Error parsing variantDesc:', error);
            return [];
        }
    }

    /**
     * Process single product type
     * @param {Object} productType_values - Product type values
     * @param {string} Seo_Meta - SEO meta data
     * @param {Array} files - Uploaded files
     * @param {string} productUrl - Product URL for folder organization
     */
    async processSingleProduct(productType_values, Seo_Meta, files, productUrl = 'default') {
        const result = {
            variantValuesArray: [],
            Seo_MetaObject: {},
            meta_Image: null
        };

        // Sanitize product URL for folder name
        const folderName = productUrl.toLowerCase().replace(/[^a-z0-9-_]/g, '_');

        try {
            const Seo_Meta_values = JSON.parse(Seo_Meta);

            result.variantValuesArray.push({
                name: "single",
                Icon: null,
                Cost: parseInt(productType_values.productCost) || null,
                Price: parseInt(productType_values.productPrice) || null,
                salePrice: parseInt(productType_values.productSalePrice) || null,
                Quantity: parseInt(productType_values.productQty) || null,
                SKU: productType_values.productSKU || null,
                EIN: productType_values.productEIN || null,
                MPN: productType_values.productMPN || null,
            });

            result.Seo_MetaObject = {
                metaTitle: Seo_Meta_values.metaTitle || null,
                metaDescription: Seo_Meta_values.metaDescription || null,
                metaKeywords: Seo_Meta_values.metaKeywords || null,
                metaSchemas: Seo_Meta_values.metaSchemas || []
            };

            // Extract and upload meta image from files
            if (files) {
                for (const file of files) {
                    if (file.fieldname === 'metaImage') {
                        if (blobStorage.isConfigured()) {
                            result.meta_Image = await blobStorage.uploadFile(file, `products/${folderName}/meta`);
                        } else {
                            result.meta_Image = { filename: file.originalname, path: file.path };
                        }
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Error processing single product:', error);
        }

        return result;
    }

    /**
     * Process variant product type
     * @param {Object} req - Request object
     * @param {string} productUrl - Product URL for folder organization
     */
    async processVariantProduct(req, productUrl = 'default') {
        const result = {
            variantValuesArray: [],
            variantNamesArray: [],
            varImgGroupArray: []
        };

        // Sanitize product URL for folder name
        const folderName = productUrl.toLowerCase().replace(/[^a-z0-9-_]/g, '_');

        const variantMetaImages = {};
        const variantImagesFiles = {};
        const varImgGroupFiles = {};

        // Separate files by type for blob upload
        req.files.forEach(file => {
            const field = file.fieldname;

            // Variant meta images
            if (field.startsWith('variantMetaImage[') && field.endsWith(']')) {
                const startIdx = field.indexOf('[') + 1;
                const endIdx = field.indexOf(']');
                const variantKey = field.slice(startIdx, endIdx);

                if (!variantMetaImages[variantKey]) {
                    variantMetaImages[variantKey] = [];
                }
                variantMetaImages[variantKey].push(file);
            }
            // Variant images
            else if (field.startsWith('variantImages[') && field.endsWith(']')) {
                const startIdx = field.indexOf('[') + 1;
                const endIdx = field.indexOf(']');
                const variantKey = field.slice(startIdx, endIdx);

                if (!variantImagesFiles[variantKey]) {
                    variantImagesFiles[variantKey] = [];
                }
                variantImagesFiles[variantKey].push(file);
            }
            // Variant image group
            else if (field.startsWith('varImg[') && field.endsWith(']')) {
                const startIdx = field.indexOf('[') + 1;
                const endIdx = field.indexOf(']');
                const variantKey = field.slice(startIdx, endIdx);

                if (!varImgGroupFiles[variantKey]) {
                    varImgGroupFiles[variantKey] = [];
                }
                varImgGroupFiles[variantKey].push(file);
            }
        });

        // Upload variant images to Blob storage
        const uploadedVariantImages = {};
        const uploadedMetaImages = {};
        const uploadedVarImgGroup = {};

        if (blobStorage.isConfigured()) {
            // Upload variant images
            for (const [key, files] of Object.entries(variantImagesFiles)) {
                uploadedVariantImages[key] = await blobStorage.uploadFiles(files, `products/${folderName}/variants/${key}`);
            }

            // Upload meta images
            for (const [key, files] of Object.entries(variantMetaImages)) {
                const uploaded = await blobStorage.uploadFiles(files, `products/${folderName}/meta/${key}`);
                uploadedMetaImages[key] = uploaded;
            }

            // Upload variant image groups
            for (const [key, files] of Object.entries(varImgGroupFiles)) {
                uploadedVarImgGroup[key] = await blobStorage.uploadFiles(files, `products/${folderName}/varimg/${key}`);
            }
        } else {
            // Fallback to local storage format
            for (const [key, files] of Object.entries(variantImagesFiles)) {
                uploadedVariantImages[key] = files.map(f => ({
                    filename: f.originalname,
                    path: f.path,
                    size: f.size
                }));
            }
            for (const [key, files] of Object.entries(variantMetaImages)) {
                uploadedMetaImages[key] = files.map(f => ({
                    filename: f.originalname,
                    path: f.path
                }));
            }
            for (const [key, files] of Object.entries(varImgGroupFiles)) {
                uploadedVarImgGroup[key] = files.map(f => ({
                    filename: f.originalname,
                    path: f.path
                }));
            }
        }

        // Convert varImgGroup object into an array
        result.varImgGroupArray = Object.keys(uploadedVarImgGroup).map(variantKey => ({
            name: variantKey,
            varImg: uploadedVarImgGroup[variantKey]
        }));

        // Parse variant values and variant names
        const { variantValues } = req.body;
        const parsedVariantValues = JSON.parse(variantValues);
        const parsedVariantNames = JSON.parse(req.body.variantNames);
        const variantNamesData = Array.isArray(parsedVariantNames) ? parsedVariantNames : [];

        // Generate all variant combinations from variantNames using SLUGS
        const generateVariantCombinations = (variantNamesData) => {
            const combinations = [];

            // Helper to generate SEO-friendly slug from string (hyphen format)
            const toSlugLocal = (str) => {
                if (!str) return '';
                return toSeoSlug(str);
            };

            // Extract slug arrays from each variant attribute
            const optionArrays = variantNamesData.map(v =>
                (v.options || []).map(opt => opt.slug || toSlugLocal(opt.value || opt.option || opt.name || opt))
            );

            if (optionArrays.length === 0 || optionArrays.some(arr => arr.length === 0)) {
                return combinations;
            }

            // Generate cartesian product of all options
            const cartesian = (arrays) => {
                return arrays.reduce((acc, curr) => {
                    const result = [];
                    acc.forEach(a => {
                        curr.forEach(b => {
                            result.push([...a, b]);
                        });
                    });
                    return result;
                }, [[]]);
            };

            const allCombinations = cartesian(optionArrays);

            // Convert each combination to a variant name string (e.g., "Brand New-Red-32GB")
            allCombinations.forEach(combo => {
                combinations.push(combo.join('-'));
            });

            return combinations;
        };

        // Check if variantValues is empty but variantNames has options
        const hasVariantValues = Object.keys(parsedVariantValues).length > 0;
        const allVariantCombinations = generateVariantCombinations(variantNamesData);

        console.log('Generated variant combinations:', allVariantCombinations.length);

        // Build variant values array
        if (hasVariantValues) {
            // Use provided variant values
            for (const key in parsedVariantValues) {
                if (Object.hasOwnProperty.call(parsedVariantValues, key)) {
                    const variantValue = parsedVariantValues[key];
                    const metaImages = uploadedMetaImages[key] || [];
                    const variantImage = uploadedVariantImages[key] || [];

                    result.variantValuesArray.push({
                        name: key.trim(),
                        variantId: generateVariantId(),
                        slug: variantNameToSeoSlug(key.trim()),
                        variantImages: variantImage,
                        Cost: parseInt(variantValue.cost) || null,
                        Price: parseInt(variantValue.price) || null,
                        Quantity: parseInt(variantValue.quantity) || null,
                        SKU: variantValue.sku || null,
                        EIN: variantValue.ein || null,
                        salePrice: variantValue.salePrice || null,
                        metaTitle: variantValue.metaTitle || null,
                        metaDescription: variantValue.metaDesc || null,
                        metaKeywords: variantValue.metaKeywords || null,
                        metaSchemas: variantValue.metaSchemas || [],
                        metaImage: metaImages.length > 0 ? metaImages[0] : null,
                        MPN: variantValue.mpn || null,
                    });
                }
            }
        } else if (allVariantCombinations.length > 0) {
            // Generate default variant values from combinations
            console.log('No variant values provided, generating from combinations...');
            allVariantCombinations.forEach(variantName => {
                const metaImages = uploadedMetaImages[variantName] || [];
                const variantImage = uploadedVariantImages[variantName] || [];

                result.variantValuesArray.push({
                    name: variantName,
                    variantId: generateVariantId(),
                    slug: variantNameToSeoSlug(variantName),
                    variantImages: variantImage,
                    Cost: null,
                    Price: null,
                    Quantity: null,
                    SKU: null,
                    EIN: null,
                    salePrice: null,
                    metaTitle: null,
                    metaDescription: null,
                    metaKeywords: null,
                    metaSchemas: [],
                    metaImage: metaImages.length > 0 ? metaImages[0] : null,
                    MPN: null,
                });
            });
            console.log('Generated', result.variantValuesArray.length, 'default variant values');
        }

        // Process variant names with dynamic attribute support

        // Check if using new dynamic variant attribute system
        const isNewFormat = variantNamesData.some(v => v.attributeSlug || v.attributeId);

        if (isNewFormat) {
            // New dynamic variant attribute system
            result.variantNamesArray = this.processVariantAttributes(variantNamesData);

            // Add structured attributes to variant values
            result.variantValuesArray = result.variantValuesArray.map(variantValue => ({
                ...variantValue,
                attributes: this.parseVariantNameToAttributes(variantValue.name, result.variantNamesArray)
            }));

            // Enhance varImgGroupArray with attribute info
            result.varImgGroupArray = result.varImgGroupArray.map(imgGroup => {
                // Try to find matching attribute info
                for (const variantDef of result.variantNamesArray) {
                    const matchingOption = variantDef.options.find(
                        opt => opt.value === imgGroup.name || opt.slug === this.generateSlug(imgGroup.name)
                    );
                    if (matchingOption) {
                        return {
                            ...imgGroup,
                            attributeSlug: variantDef.attributeSlug,
                            valueSlug: matchingOption.slug
                        };
                    }
                }
                return imgGroup;
            });
        } else {
            // Legacy format - maintain backward compatibility
            variantNamesData.forEach(variantName => {
                const { name, options } = variantName;
                result.variantNamesArray.push({
                    name,
                    attributeSlug: this.generateSlug(name),
                    hasModels: false,
                    options: Array.isArray(options) ? options.map(option => ({
                        value: option.option || option,
                        slug: this.generateSlug(option.option || option),
                        colorCode: null,
                        model: null
                    })) : []
                });
            });
        }

        return result;
    }

    /**
     * Extract and upload product images from files
     * @param {Array} files - Array of uploaded files
     * @param {string} productUrl - Product URL for folder organization
     */
    async extractProductImages(files, productUrl = 'default') {
        let thumbnail_image = null;
        const Gallery_Images = [];
        let thumbnailFile = null;
        const galleryFiles = [];

        // Sanitize product URL for folder name
        const folderName = productUrl.toLowerCase().replace(/[^a-z0-9-_]/g, '_');

        // Separate thumbnail and gallery files
        files.forEach(file => {
            const fieldname = file.fieldname;

            if (fieldname === 'thumbnail_image') {
                thumbnailFile = file;
            } else if (fieldname === 'Gallery_Images') {
                galleryFiles.push(file);
            }
        });

        // Upload to Blob storage if configured
        if (blobStorage.isConfigured()) {
            if (thumbnailFile) {
                thumbnail_image = await blobStorage.uploadFile(thumbnailFile, `products/${folderName}/thumbnails`);
            }
            if (galleryFiles.length > 0) {
                const uploadedGallery = await blobStorage.uploadFiles(galleryFiles, `products/${folderName}/gallery`);
                Gallery_Images.push(...uploadedGallery);
            }
        } else {
            // Fallback to local storage format
            if (thumbnailFile) {
                thumbnail_image = {
                    filename: thumbnailFile.originalname,
                    path: thumbnailFile.path
                };
            }
            galleryFiles.forEach(file => {
                Gallery_Images.push({
                    filename: file.originalname,
                    path: file.path
                });
            });
        }

        return { thumbnail_image, Gallery_Images };
    }

    /**
     * Validate required images
     */
    validateRequiredImages(thumbnail_image, Gallery_Images) {
        // Images are now optional - always return valid
        return { isValid: true };
    }

    /**
     * Format gallery images
     */
    formatGalleryImages(Gallery_Images) {
        if (!Gallery_Images || Gallery_Images.length === 0) {
            return [];
        }
        return Gallery_Images.map(image => ({
            filename: image.filename,
            path: image.path,
            url: image.url || null
        }));
    }

    /**
     * Build product object
     */
    buildProductObject(data) {
        const {
            name, category, subcategory, tags, brand, condition, producturl,
            is_featured, sim_option, battery, is_refundable_Values,
            variantDesc_values, is_authenticated, low_stock_quantity_alert,
            specifications_values, comesWithItems_values, has_warrantyvalues,
            productType_values, thumbnailImage, galleryImages,
            variantValuesArray, variantNamesArray, varImgGroupArray,
            Product_summary, Product_description, Seo_MetaObject,
            meta_Image, status
        } = data;

        return new Product({
            // Basic product information
            name: name,
            category: category,
            // Auto-generate producturl if empty or not provided
            producturl: producturl && producturl.trim() !== ''
                ? producturl
                : this.generateProductUrl(name),
            tags: tags,
            brand: brand,
            condition: condition,
            subCategory: subcategory,
            battery: battery || null,
            is_featured: is_featured,
            sim_options: sim_option,
            is_refundable: {
                status: is_refundable_Values.is_refundable,
                refund_duration: is_refundable_Values.refund_duration,
                refund_type: is_refundable_Values.refund_type
            },
            variantDescription: variantDesc_values || null,
            is_authenticated: is_authenticated,
            low_stock_quantity_alert: low_stock_quantity_alert || null,
            product_Specifications: specifications_values,
            // comesWithItems array (from VariantAttribute system)
            comesWithItems: comesWithItems_values || [],
            thumbnail_image: {
                filename: thumbnailImage ? thumbnailImage.filename : null,
                path: thumbnailImage ? thumbnailImage.path : null,
                url: thumbnailImage ? thumbnailImage.url : null
            },
            Gallery_Images: galleryImages,
            has_warranty: {
                status: has_warrantyvalues.has_warranty,
                has_replacement_warranty: has_warrantyvalues.has_replacement_warranty,
                Warranty_duration: has_warrantyvalues.warranty_duration,
                Warranty_type: has_warrantyvalues.warranty_type
            },
            productType: {
                type: productType_values.type
            },
            variantValues: variantValuesArray || null,
            variantNames: variantNamesArray || null,
            varImgGroup: varImgGroupArray || null,
            Product_summary: Product_summary,
            Product_description: Product_description,
            Seo_Meta: Seo_MetaObject || null,
            meta_Image: {
                filename: meta_Image ? meta_Image.filename : null,
                path: meta_Image ? meta_Image.path : null,
                url: meta_Image ? meta_Image.url : null
            },
            status: status,
            publishAt: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    }

    /**
     * Main create product logic
     */
    async createProduct(reqData) {
        try {
            console.log('\n========== SERVICE: createProduct() STARTED ==========');

            const {
                name, category, subcategory, tags, brand, condition, is_featured,
                is_refundable, is_authenticated, low_stock_quantity_alert,
                has_warranty, productType, status, Seo_Meta, Product_summary,
                Product_description, specifications, comesWithItems, variantDesc,
                sim_option, battery, producturl, req
            } = reqData;

            console.log('---------- PROCESSING VALUES ----------');

            // Process all values
            const comesWithItems_values = this.processComesWithItems(comesWithItems);
            console.log('Comes With Items:', comesWithItems_values);

            const specifications_values = this.processSpecifications(specifications);
            console.log('Specifications:', specifications_values?.length || 0, 'items');

            const is_refundable_Values = this.processRefundableValues(is_refundable);
            console.log('Refundable Values:', is_refundable_Values);

            const has_warrantyvalues = this.processWarrantyValues(has_warranty);
            console.log('Warranty Values:', has_warrantyvalues);

            const productType_values = this.processProductTypeValues(productType);
            console.log('Product Type:', productType_values);

            const variantDesc_values = this.processVariantDescriptions(variantDesc);
            console.log('Variant Descriptions:', variantDesc_values?.length || 0, 'items');
            console.log('---------------------------------------');

            // Initialize result arrays
            let variantNamesArray = [];
            let variantValuesArray = [];
            let Seo_MetaObject = {};
            let meta_Image = [];
            let varImgGroupArray = [];

            // Process based on product type
            console.log('---------- PROCESSING PRODUCT TYPE: ' + productType_values.type + ' ----------');

            if (productType_values.type === "single") {
                console.log('Processing as SINGLE product...');
                const singleResult = await this.processSingleProduct(productType_values, Seo_Meta, req.files, producturl);
                variantValuesArray = singleResult.variantValuesArray;
                Seo_MetaObject = singleResult.Seo_MetaObject;
                meta_Image = singleResult.meta_Image;
                console.log('Single Product Variant Values:', variantValuesArray);
            } else if (productType_values.type === "variant") {
                console.log('Processing as VARIANT product...');
                const variantResult = await this.processVariantProduct(req, producturl);
                variantValuesArray = variantResult.variantValuesArray;
                variantNamesArray = variantResult.variantNamesArray;
                varImgGroupArray = variantResult.varImgGroupArray;

                console.log('Variant Values Array:', variantValuesArray.length, 'variants');
                console.log('Variant Names Array:', variantNamesArray);
                console.log('Variant Image Groups:', varImgGroupArray.length, 'groups');

                // Log each variant
                variantValuesArray.forEach((v, i) => {
                    console.log(`  Variant ${i + 1}: ${v.name} - Price: ${v.Price}, Qty: ${v.Quantity}, SKU: ${v.SKU}`);
                });

                // Process product-level SEO Meta for variant products
                if (Seo_Meta) {
                    try {
                        const Seo_Meta_values = JSON.parse(Seo_Meta);
                        Seo_MetaObject = {
                            metaTitle: Seo_Meta_values.metaTitle || null,
                            metaDescription: Seo_Meta_values.metaDescription || null,
                            metaKeywords: Seo_Meta_values.metaKeywords || null,
                            metaSchemas: Seo_Meta_values.metaSchemas || []
                        };
                        console.log('SEO Meta Object:', Seo_MetaObject);
                    } catch (error) {
                        console.error('Error parsing Seo_Meta for variant product:', error);
                    }
                }

                // Extract and upload product-level meta image for variant products
                // Sanitize product URL for folder name
                const folderName = producturl.toLowerCase().replace(/[^a-z0-9-_]/g, '_');
                if (req.files) {
                    for (const file of req.files) {
                        if (file.fieldname === 'metaImage') {
                            if (blobStorage.isConfigured()) {
                                meta_Image = await blobStorage.uploadFile(file, `products/${folderName}/meta`);
                            } else {
                                meta_Image = { filename: file.originalname, path: file.path };
                            }
                            console.log('Meta Image uploaded:', meta_Image?.url || meta_Image?.filename);
                        }
                    }
                }
            }
            console.log('---------------------------------------');

            // Extract and upload images to Blob storage
            console.log('---------- EXTRACTING & UPLOADING IMAGES ----------');
            console.log('Blob Storage configured:', blobStorage.isConfigured());
            const { thumbnail_image, Gallery_Images } = await this.extractProductImages(req.files, producturl);
            console.log('Thumbnail:', thumbnail_image ? (thumbnail_image.url || thumbnail_image.filename) : 'None');
            console.log('Gallery Images:', Gallery_Images?.length || 0);

            const imageValidation = this.validateRequiredImages(thumbnail_image, Gallery_Images);
            if (!imageValidation.isValid) {
                console.error('Image validation failed:', imageValidation.message);
                return {
                    success: false,
                    message: imageValidation.message,
                    status: 400
                };
            }
            console.log('Image validation: PASSED');
            console.log('---------------------------------------');

            const thumbnailImage = thumbnail_image;
            // Gallery images are already formatted from extractProductImages
            const galleryImages = Gallery_Images;

            // Build product object
            console.log('---------- BUILDING PRODUCT OBJECT ----------');
            const newProduct = this.buildProductObject({
                name, category, subcategory, tags, brand, condition, producturl,
                is_featured, sim_option, battery, is_refundable_Values,
                variantDesc_values, is_authenticated, low_stock_quantity_alert,
                specifications_values, comesWithItems_values, has_warrantyvalues,
                productType_values, thumbnailImage, galleryImages,
                variantValuesArray, variantNamesArray, varImgGroupArray,
                Product_summary, Product_description, Seo_MetaObject,
                meta_Image, status
            });
            console.log('Product object built successfully');
            console.log('--------------------------------------------');

            // Save product to database
            console.log('---------- SAVING TO DATABASE ----------');
            const savedProduct = await newProduct.save();
            console.log('Product saved with ID:', savedProduct._id);
            console.log('Product Name:', savedProduct.name);
            console.log('Product URL:', savedProduct.producturl);
            console.log('Variants saved:', savedProduct.variantValues?.length || 0);
            console.log('----------------------------------------');

            console.log('========== SERVICE: createProduct() COMPLETED ==========\n');

            return {
                success: true,
                message: 'Product created successfully',
                product: savedProduct,
                status: 201
            };

        } catch (error) {
            console.error('========== SERVICE ERROR ==========');
            console.error('Error in createProduct service:', error);
            console.error('Stack:', error.stack);

            // Handle MongoDB duplicate key error
            if (error.code === 11000) {
                const duplicateField = Object.keys(error.keyPattern || {})[0] || 'field';
                const duplicateValue = error.keyValue ? error.keyValue[duplicateField] : 'unknown';
                return {
                    success: false,
                    message: `A product with this ${duplicateField} "${duplicateValue}" already exists. Please use a different ${duplicateField}.`,
                    status: 409
                };
            }

            // Return generic error for other cases
            return {
                success: false,
                message: error.message || 'Failed to create product',
                status: 500
            };
        }
    }
}

module.exports = new CreateProductService();
