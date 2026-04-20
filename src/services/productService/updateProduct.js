// services/productService/updateProduct.js
const Product = require('../../models/product');
const blobStorage = require('../../utils/blobStorage');
const { toSeoSlug, generateVariantId, variantNameToSeoSlug } = require('../../utils/slugUtils');

/**
 * Update Product Service
 * Handles all business logic for updating a product
 */
class UpdateProductService {
    /**
     * Generate URL slug from product name
     * Creates a clean URL-friendly string
     */
    generateSlug(name) {
        if (!name) return null;
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-')      // Replace spaces with hyphens
            .replace(/-+/g, '-')       // Replace multiple hyphens with single
            .replace(/^-|-$/g, '');    // Remove leading/trailing hyphens
    }

    /**
     * Parse field - convert string to JSON if needed
     */
    parseField(field) {
        if (!field || field === 'undefined' || field === 'null') return null;
        try {
            return typeof field === 'string' ? JSON.parse(field) : field;
        } catch (error) {
            console.error('Error parsing field:', error);
            return null;
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
            return [];
        }
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
     * Process topSectionItems array (array of slugs from VariantAttribute system)
     */
    processTopSectionItems(topSectionItems) {
        if (!topSectionItems || topSectionItems === 'undefined' || topSectionItems === 'null') return [];
        try {
            const parsed = JSON.parse(topSectionItems);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Error parsing topSectionItems:', error);
            return [];
        }
    }

    /**
     * Process specifications
     */
    processSpecifications(specifications) {
        if (!specifications || specifications === 'undefined' || specifications === 'null') return [];
        try {
            return JSON.parse(specifications) || [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Process refundable values
     */
    processRefundableValues(is_refundable) {
        if (!is_refundable || is_refundable === 'undefined' || is_refundable === 'null') return [];
        try {
            return JSON.parse(is_refundable) || [];
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
        return this.parseField(has_warranty) || [];
    }

    /**
     * Process product type values
     */
    processProductTypeValues(productType) {
        if (!productType || productType === 'undefined' || productType === 'null') return [];
        return this.parseField(productType) || [];
    }

    /**
     * Process variant values
     */
    processVariantValues(variantValues) {
        if (!variantValues || variantValues === 'undefined' || variantValues === 'null') return [];
        return this.parseField(variantValues);
    }

    /**
     * Build SEO Meta Object
     */
    buildSeoMetaObject(Seo_Meta) {
        if (!Seo_Meta || Seo_Meta === 'undefined' || Seo_Meta === 'null') return {};

        try {
            const Seo_Meta_values = this.parseField(Seo_Meta);
            if (!Seo_Meta_values) return {};
            return {
                metaTitle: Seo_Meta_values.metaTitle || null,
                metaDescription: Seo_Meta_values.metaDescription || null,
                metaKeywords: Seo_Meta_values.metaKeywords || null,
                metaSchemas: Seo_Meta_values.metaSchemas || null
            };
        } catch (error) {
            console.error('Error parsing Seo_Meta:', error);
            return {};
        }
    }

    /**
     * Process meta image from request body
     */
    processMetaImageObject(meta_Image) {
        if (!meta_Image || meta_Image === 'undefined' || meta_Image === 'null') return {};
        try {
            const parsed = JSON.parse(meta_Image);
            if (!parsed) return {};
            return {
                filename: parsed.filename,
                path: parsed.path,
                url: parsed.url || null
            };
        } catch (error) {
            console.error('Error parsing meta_Image:', error);
            return {};
        }
    }

    /**
     * Process thumbnail image from request body
     */
    processThumbnailImageObject(thumbnail_image) {
        if (!thumbnail_image || thumbnail_image === 'undefined' || thumbnail_image === 'null') return {};
        try {
            const parsed = JSON.parse(thumbnail_image);
            if (!parsed) return {};
            return {
                filename: parsed.filename,
                path: parsed.path,
                url: parsed.url || null,
                altText: parsed.altText || '',
                description: parsed.description || ''
            };
        } catch (error) {
            console.error('Error parsing thumbnail_image:', error);
            return {};
        }
    }

    /**
     * Process gallery images from request body
     */
    processGalleryImages(Gallery_Images) {
        if (!Gallery_Images) return [];

        let parsedGalleryImages = [];

        if (typeof Gallery_Images === 'string') {
            try {
                const galleryImages = JSON.parse(Gallery_Images);
                parsedGalleryImages = Array.isArray(galleryImages) ? galleryImages : [galleryImages];
            } catch (error) {
                console.error('Error parsing Gallery_Images:', error);
            }
        } else if (Array.isArray(Gallery_Images)) {
            parsedGalleryImages = Gallery_Images.map(imageStr => {
                try {
                    return JSON.parse(imageStr);
                } catch (error) {
                    console.error('Error parsing image string:', error);
                    return null;
                }
            }).filter(image => image !== null);
        }

        return parsedGalleryImages.map(image => ({
            filename: image.filename,
            path: image.path,
            url: image.url || null,
            altText: image.altText || '',
            description: image.description || ''
        }));
    }

    /**
     * Process variant images - group by attribute value (dynamic, not hardcoded to color)
     * Variant naming convention:
     * - "_" (underscore) for spaces within a single value (e.g., "brand_new" for "Brand New")
     * - "-" (hyphen) to separate different attributes (e.g., "brand_new-red-32gb")
     */
    processVariantImages(variantImages) {
        if (!variantImages) return [];

        const groupedImages = {};

        for (const variantKey in variantImages) {
            // Use the variantKey directly as the group name
            // The frontend sends the attribute value slug as the key (e.g., "red", "silver_shadow", "32gb")
            let groupName = variantKey;
            let colorCode = null;

            // Extract color code if present (format: "red" or with hex like in display)
            const colorCodeMatch = variantKey.match(/\(#([a-fA-F0-9]{6})\)/);
            if (colorCodeMatch) {
                colorCode = `#${colorCodeMatch[1]}`;
                // Remove the color code from the group name
                groupName = variantKey.replace(/\s*\(#[a-fA-F0-9]{6}\)/, '').trim();
            }

            // Initialize group for this attribute value
            if (!groupedImages[groupName]) {
                groupedImages[groupName] = {
                    displayName: colorCode ? `${groupName} (${colorCode})` : groupName,
                    varImg: []
                };
            }

            // Handle single or array images
            const imageEntries = Array.isArray(variantImages[variantKey])
                ? variantImages[variantKey]
                : [variantImages[variantKey]];

            imageEntries.forEach((imageStr) => {
                try {
                    const image = typeof imageStr === 'string' ? JSON.parse(imageStr) : imageStr;
                    if (image && !groupedImages[groupName].varImg.some((img) => img.path === image.path)) {
                        groupedImages[groupName].varImg.push(image);
                    }
                } catch (error) {
                    console.error(`Error parsing image JSON for key "${variantKey}":`, error);
                }
            });
        }

        // Transform to array format - use the group name directly (slug format)
        return Object.keys(groupedImages).map((groupName) => ({
            name: groupName,
            varImg: groupedImages[groupName].varImg,
        }));
    }

    /**
     * Extract uploaded files from req.files and upload to Blob storage
     * @param {Array} files - Uploaded files
     * @param {string} productUrl - Product URL for folder organization
     */
    async extractUploadedFiles(files, productUrl = 'default') {
        const result = {
            meta_Image: [],
            thumbnail_image: [],
            Gallery_Images: [],
            galleryImagesArray: [],
            topsectionImages: {},
            perksImage: null
        };

        if (!files) return result;

        // Sanitize product URL for folder name - ensure it's never empty
        let folderName = (productUrl || 'default').toLowerCase().replace(/[^a-z0-9-_]/g, '_');
        // Handle case where sanitization results in empty string (e.g., productUrl was only special chars)
        if (!folderName || folderName === '_') folderName = 'default';
        const useBlobStorage = blobStorage.isConfigured();

        for (const file of files) {
            const fieldname = file.fieldname;

            if (fieldname === 'meta_Image') {
                if (useBlobStorage) {
                    const uploaded = await blobStorage.uploadFile(file, `products/${folderName}/meta`);
                    result.meta_Image = uploaded;
                } else {
                    result.meta_Image = {
                        filename: file.originalname,
                        path: file.path
                    };
                }
            } else if (fieldname === 'thumbnail_image') {
                if (useBlobStorage) {
                    const uploaded = await blobStorage.uploadFile(file, `products/${folderName}/thumbnails`);
                    result.thumbnail_image = uploaded;
                } else {
                    result.thumbnail_image = {
                        filename: file.originalname,
                        path: file.path
                    };
                }
            } else if (fieldname === 'Gallery_Images') {
                if (useBlobStorage) {
                    const uploaded = await blobStorage.uploadFile(file, `products/${folderName}/gallery`);
                    if (uploaded) {
                        result.Gallery_Images.push(uploaded);
                        result.galleryImagesArray.push(uploaded);
                    }
                } else {
                    result.Gallery_Images.push(file);
                    result.galleryImagesArray.push({
                        filename: file.originalname,
                        path: file.path
                    });
                }
            } else if (fieldname.startsWith('topsectionImage_')) {
                // Handle topsection images (topsectionImage_0, topsectionImage_1, etc.)
                const index = fieldname.replace('topsectionImage_', '');
                if (useBlobStorage) {
                    const uploaded = await blobStorage.uploadFile(file, `products/${folderName}/topsection`);
                    if (uploaded) {
                        result.topsectionImages[index] = uploaded;
                    }
                } else {
                    result.topsectionImages[index] = {
                        filename: file.originalname,
                        path: file.path
                    };
                }
            } else if (fieldname === 'perksImage') {
                // Handle perks and benefits image
                if (useBlobStorage) {
                    const uploaded = await blobStorage.uploadFile(file, `products/${folderName}/perks`);
                    if (uploaded) {
                        result.perksImage = uploaded;
                    }
                } else {
                    result.perksImage = {
                        filename: file.originalname,
                        path: file.path
                    };
                }
            }
        }

        return result;
    }

    /**
     * Process variant product type
     * @param {Object} req - Request object
     * @param {Object} productType_values - Product type values
     * @param {string} productUrl - Product URL for folder organization
     */
    async processVariantProduct(req, productType_values, productUrl = 'default') {
        const { variantValues, variantImages, variantMetaImage } = req.body;

        // Sanitize product URL for folder name - ensure it's never empty
        let folderName = (productUrl || 'default').toLowerCase().replace(/[^a-z0-9-_]/g, '_');
        if (!folderName || folderName === '_') folderName = 'default';

        const result = {
            variantValuesArray: [],
            variantNamesArray: [],
            varImgGroupArray: []
        };

        let parsed_Variant_Images = {};
        let parsedMetaImages = {};
        const varImgGroup = {};

        const useBlobStorage = blobStorage.isConfigured();

        // Process uploaded files
        if (req.files) {
            for (const file of req.files) {
                const field = file.fieldname;

                // Variant meta images
                if (field.startsWith('variantMetaImage[') && field.endsWith(']')) {
                    const startIdx = field.indexOf('[') + 1;
                    const endIdx = field.indexOf(']');
                    const variantKey = field.slice(startIdx, endIdx);

                    if (!parsedMetaImages[variantKey]) {
                        parsedMetaImages[variantKey] = [];
                    }

                    if (useBlobStorage) {
                        const uploaded = await blobStorage.uploadFile(file, `products/${folderName}/variants/${variantKey}/meta`);
                        if (uploaded) {
                            parsedMetaImages[variantKey].push(uploaded);
                        }
                    } else {
                        parsedMetaImages[variantKey].push({
                            filename: file.originalname,
                            path: `/uploads/${file.originalname}`,
                        });
                    }
                }

                // Variant images
                if (field.startsWith('variantImages[') && field.endsWith(']')) {
                    const startIdx = field.indexOf('[') + 1;
                    const endIdx = field.indexOf(']');
                    const variantKey = field.slice(startIdx, endIdx);

                    if (!parsed_Variant_Images[variantKey]) {
                        parsed_Variant_Images[variantKey] = [];
                    }

                    if (useBlobStorage) {
                        const uploaded = await blobStorage.uploadFile(file, `products/${folderName}/variants/${variantKey}`);
                        if (uploaded) {
                            parsed_Variant_Images[variantKey].push(uploaded);
                        }
                    } else {
                        parsed_Variant_Images[variantKey].push({
                            filename: file.originalname,
                            path: file.path,
                        });
                    }
                }

                // Variant image group
                else if (field.startsWith('varImg[') && field.endsWith(']')) {
                    const startIdx = field.indexOf('[') + 1;
                    const endIdx = field.indexOf(']');
                    const variantKey = field.slice(startIdx, endIdx);

                    if (!varImgGroup[variantKey]) {
                        varImgGroup[variantKey] = [];
                    }

                    if (useBlobStorage) {
                        const uploaded = await blobStorage.uploadFile(file, `products/${folderName}/variants/${variantKey}`);
                        if (uploaded) {
                            varImgGroup[variantKey].push(uploaded);
                        }
                    } else {
                        varImgGroup[variantKey].push({
                            filename: file.originalname,
                            path: file.path,
                        });
                    }
                }
            }

            // Merge with existing images from req.body.variantImages
            // Dynamically extract attribute values from variant key
            // Format: "attribute1_value-attribute2_value-attribute3_value" (e.g., "brand_new-red-32gb")
            // Use the FIRST variant attribute (from variantNames) for image grouping
            if (req.body.variantImages) {
                const variantImagesBody = req.body.variantImages;

                // Get variantNames to determine the order of attributes
                let variantNamesData = [];
                try {
                    variantNamesData = req.body.variantNames ? JSON.parse(req.body.variantNames) : [];
                } catch (e) {
                    console.error('Error parsing variantNames:', e);
                }

                // Find which position corresponds to the first variant attribute
                const firstAttributeIndex = 0; // First attribute is at position 0 in split result

                for (const key in variantImagesBody) {
                    // Split variant key into individual attribute values
                    const attributeValues = key.split('-');

                    // Use the first attribute value (index 0) for image grouping
                    // This corresponds to the first selected Product Variant
                    const groupKey = attributeValues[firstAttributeIndex] || key;

                    if (!varImgGroup[groupKey]) {
                        varImgGroup[groupKey] = [];
                    }

                    const imagesArray = Array.isArray(variantImagesBody[key])
                        ? variantImagesBody[key]
                        : [variantImagesBody[key]];

                    imagesArray.forEach(imageStr => {
                        try {
                            const image = typeof imageStr === 'string' ? JSON.parse(imageStr) : imageStr;
                            if (image && !varImgGroup[groupKey].some(img => (img.path === image.path) || (img.url && img.url === image.url))) {
                                varImgGroup[groupKey].push(image);
                            }
                        } catch (e) {
                            console.error(`Error parsing JSON for key ${key}:`, e);
                        }
                    });
                }
            }

            // Merge with existing images from req.body.varImg (this is what frontend sends)
            if (req.body.varImg) {
                const varImgBody = req.body.varImg;
                for (const variantKey in varImgBody) {
                    if (!varImgGroup[variantKey]) {
                        varImgGroup[variantKey] = [];
                    }

                    const imagesArray = Array.isArray(varImgBody[variantKey])
                        ? varImgBody[variantKey]
                        : [varImgBody[variantKey]];

                    imagesArray.forEach(imageStr => {
                        try {
                            const image = typeof imageStr === 'string' ? JSON.parse(imageStr) : imageStr;
                            if (image && !varImgGroup[variantKey].some(img => (img.path === image.path) || (img.url && img.url === image.url))) {
                                varImgGroup[variantKey].push(image);
                            }
                        } catch (e) {
                            console.error(`Error parsing JSON for varImg key ${variantKey}:`, e);
                        }
                    });
                }
            }

            result.varImgGroupArray = Object.keys(varImgGroup).map(variantKey => ({
                name: variantKey,
                varImg: varImgGroup[variantKey]
            }));
        }

        // Also process varImg from body even if no files were uploaded (to preserve existing images)
        if (!req.files || req.files.length === 0) {
            if (req.body.varImg) {
                const varImgBody = req.body.varImg;
                for (const variantKey in varImgBody) {
                    const imagesArray = Array.isArray(varImgBody[variantKey])
                        ? varImgBody[variantKey]
                        : [varImgBody[variantKey]];

                    const parsedImages = [];
                    imagesArray.forEach(imageStr => {
                        try {
                            const image = typeof imageStr === 'string' ? JSON.parse(imageStr) : imageStr;
                            if (image) {
                                parsedImages.push(image);
                            }
                        } catch (e) {
                            console.error(`Error parsing JSON for varImg key ${variantKey}:`, e);
                        }
                    });

                    if (parsedImages.length > 0) {
                        result.varImgGroupArray.push({
                            name: variantKey,
                            varImg: parsedImages
                        });
                    }
                }
            }
        }

        // Parse variant values
        const parsedVariantValues = typeof variantValues === 'string'
            ? JSON.parse(variantValues)
            : variantValues;
        const parsedVariantImages = typeof variantImages === 'string'
            ? JSON.parse(variantImages)
            : variantImages;
        const parsedvariantMetaImage = typeof variantMetaImage === 'string'
            ? JSON.parse(variantMetaImage)
            : variantMetaImage;

        // Build variant values array
        for (const key in parsedVariantValues) {
            if (Object.hasOwnProperty.call(parsedVariantValues, key)) {
                const variantValue = parsedVariantValues[key];
                const parsedVariant = parsed_Variant_Images[key] || [];
                const variantmetaImage = parsedMetaImages[key] || [];

                let images = parsedVariant;
                if (parsedVariantImages && parsedVariantImages[key]) {
                    const existingImages = Array.isArray(parsedVariantImages[key])
                        ? parsedVariantImages[key].map(imageStr => {
                            try {
                                return JSON.parse(imageStr);
                            } catch (e) {
                                console.error('Invalid JSON in variantImages:', e);
                                return null;
                            }
                        }).filter(image => image !== null)
                        : (() => {
                            try {
                                return [JSON.parse(parsedVariantImages[key])];
                            } catch (e) {
                                console.error('Invalid JSON in variantImages:', e);
                                return [];
                            }
                        })();

                    images = images.concat(existingImages);
                }

                let variantMetaImageObject = null;
                if (parsedvariantMetaImage && parsedvariantMetaImage[key]) {
                    try {
                        const variantMetaImage = JSON.parse(parsedvariantMetaImage[key]);
                        if (Array.isArray(variantMetaImage)) {
                            variantMetaImageObject = {
                                filename: variantMetaImage[0].filename,
                                path: variantMetaImage[0].path,
                                url: variantMetaImage[0].url || null
                            };
                        } else if (typeof variantMetaImage === 'object') {
                            variantMetaImageObject = {
                                filename: variantMetaImage.filename,
                                path: variantMetaImage.path,
                                url: variantMetaImage.url || null
                            };
                        }
                    } catch (e) {
                        console.error('Invalid JSON in parsedvariantMetaImage:', e);
                    }
                }

                // Preserve existing variantId or generate new one
                const existingVariantId = variantValue.variantId || null;
                // Generate SEO-friendly slug from variant name
                const seoSlug = variantNameToSeoSlug(key.trim());

                console.log('========== VARIANT UPDATE ==========');
                console.log('Variant Name:', key.trim());
                console.log('Existing variantId:', existingVariantId);
                console.log('New/Preserved variantId:', existingVariantId || 'GENERATING NEW');
                console.log('Generated SEO Slug:', seoSlug);
                console.log('====================================');

                const variantObject = {
                    name: key.trim(),
                    variantId: existingVariantId || generateVariantId(),
                    slug: seoSlug,
                    variantImages: images || parsedVariant,
                    Cost: variantValue.Cost || null,
                    Price: variantValue.Price || null,
                    Quantity: variantValue.Quantity || null,
                    SKU: variantValue.SKU || null,
                    EIN: variantValue.EIN || null,
                    salePrice: variantValue.salePrice || null,
                    metaTitle: variantValue.metaTitle || null,
                    metaDescription: variantValue.metaDescription || null,
                    metaKeywords: variantValue.metaKeywords || null,
                    metaSchemas: variantValue.metaSchemas || null,
                    metaImage: variantmetaImage.length > 0 ? variantmetaImage[0] : variantMetaImageObject,
                    MPN: variantValue.MPN || null,
                    status: variantValue.status !== undefined ? variantValue.status : true,
                };

                result.variantValuesArray.push(variantObject);
            }
        }

        // Sync variantImages from varImgGroupArray
        // This handles both single variants ("red") and multi-variants ("brand_new-red-32gb")
        if (result.varImgGroupArray.length > 0) {
            result.variantValuesArray = result.variantValuesArray.map(variant => {
                const variantAttributes = variant.name.split('-');

                // Find a matching group by checking ALL parts of the variant name
                let matchedGroup = null;
                for (const attr of variantAttributes) {
                    matchedGroup = result.varImgGroupArray.find(group => group.name === attr);
                    if (matchedGroup) break;
                }

                // If we found a matching group, use its images
                if (matchedGroup && matchedGroup.varImg && matchedGroup.varImg.length > 0) {
                    return {
                        ...variant,
                        variantImages: matchedGroup.varImg
                    };
                }

                return variant;
            });
        }

        // Process variant names - store full dynamic attribute information
        const variantNamesData = JSON.parse(req.body.variantNames);
        console.log('========== VARIANT NAMES PROCESSING ==========');
        console.log('Total variant attributes:', variantNamesData.length);

        // Deduplicate options within each variant attribute
        variantNamesData.forEach(variantName => {
            if (variantName.options && Array.isArray(variantName.options)) {
                const seenSlugs = new Set();
                variantName.options = variantName.options.filter(opt => {
                    const slug = (typeof opt === 'string' ? opt : (opt.slug || opt.value || opt.name || '')).toLowerCase().replace(/_/g, '-');
                    if (seenSlugs.has(slug)) {
                        console.log(`  [DEDUP] Removing duplicate option with slug: "${slug}"`);
                        return false;
                    }
                    seenSlugs.add(slug);
                    return true;
                });
            }
        });
        console.log('After deduplication:');

        variantNamesData.forEach(variantName => {
            // Support both old format (name, options) and new format (with attributeId, attributeSlug, etc.)
            const variantNameObj = {
                name: variantName.name || variantName.attributeSlug,
                attributeId: variantName.attributeId || null,
                attributeSlug: variantName.attributeSlug || variantName.name,
                hasModels: variantName.hasModels || false,
                options: (variantName.options || []).map(opt => {
                    // Handle both string options and object options
                    if (typeof opt === 'string') {
                        const slugValue = toSeoSlug(opt);
                        console.log(`  Option (string): "${opt}" => slug: "${slugValue}"`);
                        return {
                            value: opt,
                            slug: slugValue,
                            colorCode: null,
                            models: []
                        };
                    }
                    const optValue = opt.value || opt.name || opt.option;
                    const slugValue = opt.slug ? toSeoSlug(opt.slug) : toSeoSlug(opt.value || opt.name || '');
                    console.log(`  Option (object): "${optValue}" => slug: "${slugValue}" (original slug: "${opt.slug || 'none'}")`);
                    return {
                        value: optValue,
                        slug: slugValue,
                        colorCode: opt.colorCode || null,
                        models: opt.models || []
                    };
                })
            };
            result.variantNamesArray.push(variantNameObj);
            console.log(`Attribute: "${variantNameObj.name}" with ${variantNameObj.options.length} options`);
        });
        console.log('===============================================');

        return result;
    }

    /**
     * Process single product type
     */
    processSingleProduct(variant_Values, Seo_Meta) {
        const variantValuesArray = [];

        if (Array.isArray(variant_Values)) {
            variant_Values.forEach(item => {
                const Seo_Meta_values = this.parseField(Seo_Meta);

                variantValuesArray.push({
                    name: item.name || "single",
                    Icon: null,
                    Cost: item.Cost || null,
                    Price: item.Price || null,
                    salePrice: item.salePrice || null,
                    Quantity: item.Quantity || null,
                    SKU: item.SKU || null,
                    EIN: item.EIN || null,
                    MPN: item.MPN || null,
                    status: item.status !== undefined ? item.status : true,
                });
            });
        }

        return variantValuesArray;
    }

    /**
     * Main update product logic
     */
    async updateProduct(productId, reqData) {
        try {
            const {
                name, category, subcategory, tags, brand, condition, is_featured,
                is_refundable, is_authenticated, low_stock_quantity_alert,
                has_warranty, productType, status, Seo_Meta, Product_summary,
                Product_description, comesWithItems, topSectionItems, selectOption, specifications, variantDesc,
                sim_option, battery, producturl, seeAccessoriesWeDontNeed, topsection,
                perks_and_benefits, req
            } = reqData;

            // Find product
            const product = await Product.findById(productId);
            if (!product) {
                return { success: false, message: 'Product not found', status: 404 };
            }

            // Process all values
            const variantDesc_values = this.processVariantDescriptions(variantDesc);
            const sim_options = sim_option || [];
            const comesWithItems_values = this.processComesWithItems(comesWithItems);
            const topSectionItems_values = this.processTopSectionItems(topSectionItems);
            const specifications_values = this.processSpecifications(specifications);
            const is_refundable_Values = this.processRefundableValues(is_refundable);
            const has_warrantyvalues = this.processWarrantyValues(has_warranty);
            const productType_values = this.processProductTypeValues(productType);
            const variant_Values = this.processVariantValues(req.body.variantValues);

            // Build SEO Meta
            const Seo_MetaObject = this.buildSeoMetaObject(Seo_Meta);

            // Process images from body
            const meta_ImageObject = this.processMetaImageObject(req.body.meta_Image);
            const thumbnail_imageObject = this.processThumbnailImageObject(req.body.thumbnail_image);
            const galleryImagesArray = this.processGalleryImages(req.body.Gallery_Images);

            // Process variant images
            const varImgGroupArray = this.processVariantImages(req.body.variantImages);

            // Extract uploaded files (async for Blob storage)
            const uploadedFiles = await this.extractUploadedFiles(req.files, producturl);

            // Process based on product type
            let variantValuesArray = [];
            let variantNamesArray = [];
            let finalVarImgGroupArray = varImgGroupArray;

            if (productType_values.type === 'variant') {
                const variantResult = await this.processVariantProduct(req, productType_values, producturl);

                variantValuesArray = variantResult.variantValuesArray;
                variantNamesArray = variantResult.variantNamesArray;
                finalVarImgGroupArray = variantResult.varImgGroupArray.length > 0
                    ? variantResult.varImgGroupArray
                    : varImgGroupArray;
            } else {
                variantValuesArray = this.processSingleProduct(variant_Values, Seo_Meta);
            }

            // Update product fields
            product.name = name;
            // Auto-generate producturl if empty or not provided
            product.producturl = producturl && producturl.trim() !== ''
                ? producturl
                : this.generateSlug(name);
            product.category = category;
            product.tags = tags;
            product.subCategory = subcategory;
            product.brand = brand;
            product.battery = battery || null;
            product.condition = condition;
            product.is_featured = is_featured;
            product.seeAccessoriesWeDontNeed = seeAccessoriesWeDontNeed === 'true' ? true : seeAccessoriesWeDontNeed === 'false' ? false : null;

            // Process topsection with images
            const topsectionData = topsection ? this.parseField(topsection) : [];
            product.topsection = topsectionData.map((item) => {
                // Check if this item has an uploaded image by index
                if (item.imageIndex !== undefined && uploadedFiles.topsectionImages[item.imageIndex]) {
                    return {
                        name: item.name,
                        description: item.description,
                        image: uploadedFiles.topsectionImages[item.imageIndex]
                    };
                }
                // Keep existing image if present
                return {
                    name: item.name,
                    description: item.description,
                    image: item.image || null
                };
            });

            // Process perks_and_benefits with image
            const perksData = perks_and_benefits ? this.parseField(perks_and_benefits) : {};
            product.perks_and_benefits = {
                status: perksData.status || false,
                description: perksData.description || null,
                image: perksData.hasNewImage && uploadedFiles.perksImage
                    ? uploadedFiles.perksImage
                    : (perksData.image || null)
            };

            product.is_refundable = {
                status: is_refundable_Values.status,
                refund_duration: is_refundable_Values.refund_duration,
                refund_type: is_refundable_Values.refund_type
            };

            product.is_authenticated = is_authenticated;
            product.low_stock_quantity_alert = low_stock_quantity_alert !== null &&
                low_stock_quantity_alert !== undefined &&
                !isNaN(Number(low_stock_quantity_alert))
                ? Number(low_stock_quantity_alert)
                : null;

            product.thumbnail_image = {
                filename: uploadedFiles.thumbnail_image?.filename || thumbnail_imageObject.filename,
                path: uploadedFiles.thumbnail_image?.path || thumbnail_imageObject.path,
                url: uploadedFiles.thumbnail_image?.url || thumbnail_imageObject.url || null,
                altText: thumbnail_imageObject.altText || product.thumbnail_image?.altText || '',
                description: thumbnail_imageObject.description || product.thumbnail_image?.description || ''
            };

            // Merge existing images (from body) with newly uploaded images
            const existingGalleryImages = galleryImagesArray || [];
            const newlyUploadedImages = uploadedFiles.galleryImagesArray.map(img => ({
                filename: img.filename,
                path: img.path,
                url: img.url || null,
                altText: '',
                description: ''
            }));
            
            // Combine: keep existing images and append newly uploaded ones
            product.Gallery_Images = [...existingGalleryImages, ...newlyUploadedImages];

            product.has_warranty = {
                status: has_warrantyvalues.status,
                has_replacement_warranty: has_warrantyvalues.has_replacement_warranty,
                Warranty_duration: has_warrantyvalues.Warranty_duration,
                Warranty_type: has_warrantyvalues.Warranty_type
            };

            product.productType = {
                type: productType_values.type
            };

            product.variantNames = variantNamesArray;

            // Deduplicate variantValues by normalized name (underscore -> hyphen)
            const normalizeVariantName = (name) => {
                if (!name) return '';
                return name.toLowerCase().replace(/_/g, '-');
            };
            const seenVariantNames = new Set();
            const uniqueVariantValues = variantValuesArray.filter(variant => {
                const normalizedName = normalizeVariantName(variant.name);
                if (seenVariantNames.has(normalizedName)) {
                    console.log(`[DEDUP] Removing duplicate variant: "${variant.name}" (normalized: "${normalizedName}")`);
                    return false;
                }
                seenVariantNames.add(normalizedName);
                return true;
            });
            if (variantValuesArray.length !== uniqueVariantValues.length) {
                console.log(`[DEDUP] Removed ${variantValuesArray.length - uniqueVariantValues.length} duplicate variants`);
            }

            product.variantValues = uniqueVariantValues;
            product.variantDescription = variantDesc_values || null;
            product.varImgGroup = finalVarImgGroupArray || null;

            product.sim_options = sim_options || null;
            product.product_Specifications = specifications_values;

            // comesWithItems array (from VariantAttribute system)
            product.comesWithItems = comesWithItems_values || [];

            // topSectionItems array (from VariantAttribute system)
            product.topSectionItems = topSectionItems_values || [];

            // selectOption (single slug from VariantAttribute system)
            product.selectOption = selectOption || null;

            product.Product_summary = Product_summary;
            product.Product_description = Product_description;
            product.Seo_Meta = Seo_MetaObject || null;
            product.status = status;

            product.meta_Image = {
                filename: meta_ImageObject.filename || uploadedFiles.meta_Image?.filename,
                path: meta_ImageObject.path || uploadedFiles.meta_Image?.path,
                url: meta_ImageObject.url || uploadedFiles.meta_Image?.url || null
            };

            product.updatedAt = Date.now();

            // Save product
            const savedProduct = await product.save();

            console.log('========== PRODUCT SAVED SUCCESSFULLY ==========');
            console.log('Product ID:', savedProduct._id);
            console.log('Product Name:', savedProduct.name);
            console.log('Total Variants:', savedProduct.variantValues?.length || 0);
            if (savedProduct.variantValues?.length > 0) {
                console.log('Variant Slugs:');
                savedProduct.variantValues.forEach((v, i) => {
                    console.log(`  ${i + 1}. name: "${v.name}" | slug: "${v.slug}" | variantId: "${v.variantId}"`);
                });
            }
            console.log('================================================');

            return {
                success: true,
                message: 'Product updated successfully',
                product: savedProduct,
                status: 201
            };

        } catch (error) {
            console.error('Error in updateProduct service:', error);
            throw error;
        }
    }
}

module.exports = new UpdateProductService();
