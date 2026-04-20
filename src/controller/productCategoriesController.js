// controller/productCategoriescontroller.js

const db = require("../../connections/mongo");
const bcrypt = require("bcrypt");
const ProductCategory = require("../models/productCategories");
const Navbar = require("../models/Navbar");
const CategoryDisplayProducts = require("../models/categoryDisplayProducts");

const multer = require("multer");
const moment = require("moment");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const blobStorage = require("../utils/blobStorage");
const { replaceFileReferenceInBlocks } = require("./homepageDataController");

const MAX_NAVBAR_ITEMS = 50;
const CATEGORY_BLOCK_IMAGE_SLOT_COUNT = 40;
const categoryBlockImageMulterFields = Array.from(
  { length: CATEGORY_BLOCK_IMAGE_SLOT_COUNT },
  (_, i) => ({ name: `categoryBlockImages_${i}`, maxCount: 1 })
);
const subcategoryBlockImageMulterFields = Array.from(
  { length: CATEGORY_BLOCK_IMAGE_SLOT_COUNT },
  (_, i) => ({ name: `subcategoryBlockImages_${i}`, maxCount: 1 })
);

/** Match URL slugs (e.g. vent-clip) to DB values (e.g. "Vent Clip", "Vent-Clip"). */
function normalizeSubcategorySlug(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function sanitizeNavCustomLabel(raw) {
  if (raw == null) return "";
  return String(raw).trim().replace(/[<>]/g, "").slice(0, 100);
}

function normalizeNavCustomPath(raw) {
  const s = String(raw == null ? "" : raw).trim().slice(0, 500);
  if (!s) return { ok: false, message: "Path is required" };
  if (/javascript:/i.test(s) || /\s/.test(s)) {
    return { ok: false, message: "Invalid path" };
  }
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { ok: false, message: "Only http(s) URLs are allowed" };
      }
      return { ok: true, value: s };
    } catch {
      return { ok: false, message: "Invalid URL" };
    }
  }
  if (!s.startsWith("/")) {
    return {
      ok: false,
      message: "Internal paths must start with / (e.g. /deals-and-discounts)",
    };
  }
  if (s.startsWith("//")) {
    return { ok: false, message: "Invalid path" };
  }
  return { ok: true, value: s };
}

// Use memory storage for Vercel Blob uploads
const storage = multer.memoryStorage();

const uploadCategoryImage = multer({ storage: storage }).fields([
  { name: "Logo", maxCount: 1 },
  { name: "metaImage", maxCount: 1 },
  { name: "banner", maxCount: 1 },
  ...categoryBlockImageMulterFields,
  ...subcategoryBlockImageMulterFields,
]);

const productCategoriescontroller = {
  createProductCategory: async (req, res) => {
    try {
      // Upload the category images
      uploadCategoryImage(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          // Handle Multer errors
          console.error("Multer error:", err);
          return res.json({ message: "Error uploading image", status: 400 });
        } else if (err) {
          // Handle other errors
          console.error("Error uploading image:", err);
          return res.json({ message: "Failed to upload image", status: 500 });
        }

        // Extract data from the request body
        const { name, metaTitle, metaDescription, isPublish, isFeatured } =
          req.body;

        // Generate folder name from category name
        const folderName = name ? name.toLowerCase().replace(/[^a-z0-9-_]/g, '_') : 'category';

        // Upload images to Vercel Blob storage
        let LogoImage = null;
        let metaImage = null;
        let bannerImage = null;

        if (blobStorage.isConfigured()) {
          if (req.files["Logo"] && req.files["Logo"][0]) {
            LogoImage = await blobStorage.uploadFile(req.files["Logo"][0], `categories/${folderName}/logo`);
          }
          if (req.files["metaImage"] && req.files["metaImage"][0]) {
            metaImage = await blobStorage.uploadFile(req.files["metaImage"][0], `categories/${folderName}/meta`);
          }
          if (req.files["banner"] && req.files["banner"][0]) {
            bannerImage = await blobStorage.uploadFile(req.files["banner"][0], `categories/${folderName}/banner`);
          }
        } else {
          // Fallback to local storage format (shouldn't happen in production)
          console.warn("Blob storage not configured, images will not be saved properly");
        }

        // Create a new product category instance
        const newProductCategory = new ProductCategory({
          name,
          metaTitle,
          metaDescription,
          isPublish,
          isFeatured,
          Logo: LogoImage,
          metaImage,
          bannerImage,
        });

        // Save the product category to the database
        const savedProductCategory = await newProductCategory.save();

        // Return success response
        return res
          .status(201)
          .json({
            message: "Product category created successfully",
            category: savedProductCategory,
            status: 201,
          });
      });
    } catch (error) {
      // Log error
      console.error("Error creating product category:", error);
      // Return error response
      return res
        .status(500)
        .json({ error: "Failed to create product category", status: 500 });
    }
  },

  getAllProductCategory : async (req, res) => {
    try {
      // Fetch product categories with specific fields
      const productCategories = await ProductCategory.find();

      // Fetch display products count for each category
      const displayProductsCounts = await CategoryDisplayProducts.find({}, 'categoryId products');

      // Create a map of categoryId to display products count
      const displayCountsMap = {};
      displayProductsCounts.forEach(doc => {
        displayCountsMap[doc.categoryId.toString()] = doc.products ? doc.products.length : 0;
      });

      // Add displayProductsCount to each category
      const categoriesWithDisplayCount = productCategories.map(category => {
        const categoryObj = category.toObject();
        categoryObj.displayProductsCount = displayCountsMap[category._id.toString()] || 0;
        return categoryObj;
      });

      return res.json({
        message: "Categories fetched successfully",
        status: 201,
        productCategories: categoriesWithDisplayCount,
      });
    } catch (error) {
      console.error("Error fetching product categories:", error);
      return res.status(500).json({
        message: "Failed to fetch product categories",
        status: 500,
      });
    }
  },
  getCategoryServersideRendering: async (req, res) => {
    try {
      // Fetch product categories with specific fields
      const productCategories = await ProductCategory.find(
        {},
        "_id name isPublish isFeatured createdAt subCategory metasubCategory bannerImage"
      );
  
      return res.json({
        message: "Categories fetched successfully",
        status: 201,
        productCategories,
      });
    } catch (error) {
      console.error("Error fetching product categories:", error);
      return res.status(500).json({
        message: "Failed to fetch product categories",
        status: 500,
      });
    }
  },  
  getProductCategoryCustomized: async (req, res) => {
    try {
      // Fetch product categories with specific fields
      const productCategories = await ProductCategory.find()
        .select('bannerImage createdAt isFeatured isPublish name subCategory _id');
  
      return res.json({
        message: "Categories fetched successfully",
        status: 201,
        productCategories,
      });
    } catch (error) {
      console.error("Error fetching product categories:", error);
      return res.status(500).json({
        message: "Failed to fetch product categories",
        status: 500,
      });
    }
  },
  
  deleteProductCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedProductCategory = await ProductCategory.findByIdAndDelete(
        id
      );
      return res.json({
        message: "Deleted",
        deletedProductCategory,
        status: 201,
      });
    } catch (error) {
      console.error("Error deleting product category:", error);
      return res.json({
        error: "Failed to delete product category",
        status: 500,
      });
    }
  },
  featureProductCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { isFeatured } = req.body;
      console.log(isFeatured);
      const updatedProductCategory = await ProductCategory.findByIdAndUpdate(
        id,
        { isFeatured: req.body.isFeatured }
      );

      if (!updatedProductCategory) {
        return res.json({ error: "Product category not found", status: 404 });
      }

      return res.json({
        message: "Product category featured successfully",
        updatedProductCategory,
        status: 201,
      });
    } catch (error) {
      console.error("Error featuring product category:", error);
      return res.json({
        error: "Failed to feature product category",
        status: 500,
      });
    }
  },

  statusProductCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { isPublish } = req.body;
      console.log(isPublish);
      const updatedProductCategory = await ProductCategory.findByIdAndUpdate(
        id,
        { isPublish: req.body.isPublish }
      );
      return res.json({
        message: "Product category status updated successfully",
        updatedProductCategory,
        status: 201,
      });
    } catch (error) {
      console.error("Error updating product category status:", error);
      return res.json({
        error: "Failed to update product category status",
        status: 500,
      });
    }
  },
  updateProductCategory: async (req, res) => {
    try {
      uploadCategoryImage(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          // Handle Multer errors here
          console.error("Multer error:", err);
          return res.json({
            error: "Error uploading category image",
            status: 400,
          });
        } else if (err) {
          // Handle other errors here
          console.error("Error uploading category image:", err);
          return res.json({
            error: "Failed to upload category image",
            status: 500,
          });
        }
        const { id } = req.params;
        const {
          name,
          metaTitle,
          metaDescription,
          isPublish,
          isFeatured,
          metaKeywords,
          content,
          content_blocks,
          categoryBlockImageCount,
        } = req.body;
        console.log(req.body);

        let productCategory = await ProductCategory.findById(id);

        if (!productCategory) {
          return res.json({ error: "Product category not found", status: 404 });
        }

        // Extract the existing Logo, meta image, and banner information from the database
        const existingLogo = productCategory.Logo;
        const existingMetaImage = productCategory.metaImage;
        const existingBanner = productCategory.bannerImage;

        // Handle uploaded files (Logo, metaImage, and banner)
        let LogoImage = existingLogo;
        let metaImage = existingMetaImage;
        let BannerImage = existingBanner;

        // Generate folder name from category name
        const categoryName = name || productCategory.name;
        const folderName = categoryName ? categoryName.toLowerCase().replace(/[^a-z0-9-_]/g, '_') : 'category';

        if (req.files && (req.files["Logo"] || req.files["metaImage"] || req.files["banner"])) {
          if (blobStorage.isConfigured()) {
            // Upload to Vercel Blob storage
            if (req.files["Logo"] && req.files["Logo"][0]) {
              // Delete old image if exists
              if (existingLogo && existingLogo.url) {
                await blobStorage.deleteFile(existingLogo.url);
              }
              LogoImage = await blobStorage.uploadFile(req.files["Logo"][0], `categories/${folderName}/logo`);
            }
            if (req.files["metaImage"] && req.files["metaImage"][0]) {
              // Delete old image if exists
              if (existingMetaImage && existingMetaImage.url) {
                await blobStorage.deleteFile(existingMetaImage.url);
              }
              metaImage = await blobStorage.uploadFile(req.files["metaImage"][0], `categories/${folderName}/meta`);
            }
            if (req.files["banner"] && req.files["banner"][0]) {
              // Delete old image if exists
              if (existingBanner && existingBanner.url) {
                await blobStorage.deleteFile(existingBanner.url);
              }
              BannerImage = await blobStorage.uploadFile(req.files["banner"][0], `categories/${folderName}/banner`);
            }
          } else {
            console.warn("Blob storage not configured, images will not be saved properly");
          }
        }

        // Update the product category fields
        productCategory.name = name || productCategory.name;
        productCategory.metaTitle = metaTitle !== undefined ? metaTitle : productCategory.metaTitle;
        productCategory.metaDescription =
          metaDescription !== undefined ? metaDescription : productCategory.metaDescription;
        productCategory.metaKeywords =
          metaKeywords !== undefined ? metaKeywords : productCategory.metaKeywords;
        productCategory.content = content !== undefined ? content : productCategory.content;
        productCategory.isPublish =
          isPublish !== undefined ? isPublish : productCategory.isPublish;
        productCategory.isFeatured =
          isFeatured !== undefined ? isFeatured : productCategory.isFeatured;
        productCategory.bannerImage = BannerImage;
        productCategory.Logo = LogoImage;
        productCategory.metaImage = metaImage;

        // Parse and update metaSchemas
        if (req.body.metaSchemas) {
          productCategory.metaSchemas = JSON.parse(req.body.metaSchemas);
        }

        // Block-based page content (same pipeline as product / homepage)
        if (content_blocks !== undefined && content_blocks !== null) {
          let blocksArray = null;
          try {
            if (typeof content_blocks === "string") {
              const raw = content_blocks.trim();
              blocksArray = raw === "" ? [] : JSON.parse(raw);
            } else if (Array.isArray(content_blocks)) {
              blocksArray = content_blocks;
            }
          } catch (e) {
            console.error(
              "[updateProductCategory] Invalid content_blocks JSON",
              e
            );
            blocksArray = null;
          }
          if (Array.isArray(blocksArray)) {
            const imgCount = parseInt(
              categoryBlockImageCount === undefined ||
                categoryBlockImageCount === null
                ? "0"
                : String(categoryBlockImageCount),
              10
            );
            const filesMap = req.files || {};
            if (imgCount > 0 && blobStorage.isConfigured()) {
              const folderName = categoryName
                ? categoryName.toLowerCase().replace(/[^a-z0-9-_]/g, "_")
                : "category";
              for (let i = 0; i < imgCount; i++) {
                const slot = filesMap[`categoryBlockImages_${i}`];
                const entry = Array.isArray(slot) ? slot[0] : slot;
                if (!entry) continue;
                let fileUrl = null;
                try {
                  const uploaded = await blobStorage.uploadFile(
                    entry,
                    `categories/${folderName}/content-blocks`
                  );
                  fileUrl = uploaded?.url || null;
                } catch (uploadErr) {
                  console.error(
                    "[updateProductCategory] category block file upload failed",
                    uploadErr
                  );
                }
                if (fileUrl) {
                  replaceFileReferenceInBlocks(
                    blocksArray,
                    `__FILE_REFERENCE__${i}__`,
                    fileUrl
                  );
                }
              }
            }
            productCategory.content_blocks =
              blocksArray.length > 0 ? blocksArray : [];
          }
        }

        if (
          Array.isArray(productCategory.content_blocks) &&
          productCategory.content_blocks.length > 0
        ) {
          productCategory.content = "";
        }

        // Save the updated product category
        const updatedProductCategory = await productCategory.save();

        // Return success response
        return res.json({
          message: "Product category updated successfully",
          category: updatedProductCategory,
          status: 201,
        });
      });
    } catch (error) {
      // Log error
      console.error("Error updating product category:", error);
      // Return error response
      return res.json({
        error: "Failed to update product category",
        status: 500,
      });
    }
  },
  updateProductsubCategory: async (req, res) => {
    try {
      uploadCategoryImage(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          console.error("Multer error:", err);
          return res
            .status(400)
            .json({ error: "Error uploading category image", status: 400 });
        } else if (err) {
          console.error("Error uploading category image:", err);
          return res
            .status(500)
            .json({ error: "Failed to upload category image", status: 500 });
        }

        const { id } = req.params;
        let { metasubCategory } = req.body;
        // multipart/form-data sends text fields as strings — must parse JSON
        if (typeof metasubCategory === "string" && metasubCategory.length) {
          try {
            metasubCategory = JSON.parse(metasubCategory);
          } catch (e) {
            console.error("Invalid metasubCategory JSON:", e);
            metasubCategory = null;
          }
        }

        let productCategory = await ProductCategory.findById(id);
        if (!productCategory) {
          return res
            .status(404)
            .json({ error: "Product category not found", status: 404 });
        }

        const folderName = productCategory.name
          ? productCategory.name.toLowerCase().replace(/[^a-z0-9-_]/g, "_")
          : "category";

        // Handle uploaded files - upload to Vercel Blob
        let bannerImage = null;

        if (req.files && req.files["banner"] && req.files["banner"][0]) {
          if (blobStorage.isConfigured()) {
            bannerImage = await blobStorage.uploadFile(req.files["banner"][0], `categories/${folderName}/subcategory-banners`);
          } else {
            console.warn("Blob storage not configured, images will not be saved properly");
          }
        }

        // Handle metasubCategory update
        if (
          typeof metasubCategory === "object" &&
          !Array.isArray(metasubCategory)
        ) {
          const subCategoryName = Object.keys(metasubCategory)[0]; // Get the subcategory name (e.g., 'Galaxy S Series')
          const subCategoryData = metasubCategory[subCategoryName]; // Get the metadata associated with the subcategory

          let subCategoryIndex = subCategoryData.subCategoryIndex;

          /** Parsed + uploaded subcategory page blocks; undefined = do not change */
          let parsedSubcategoryContentBlocks = undefined;
          const { content_blocks, subcategoryBlockImageCount } = req.body;
          if (content_blocks !== undefined && content_blocks !== null) {
            let blocksArray = null;
            try {
              if (typeof content_blocks === "string") {
                const raw = content_blocks.trim();
                blocksArray = raw === "" ? [] : JSON.parse(raw);
              } else if (Array.isArray(content_blocks)) {
                blocksArray = content_blocks;
              }
            } catch (e) {
              console.error(
                "[updateProductsubCategory] Invalid content_blocks JSON",
                e
              );
              blocksArray = null;
            }
            if (Array.isArray(blocksArray)) {
              const imgCount = parseInt(
                subcategoryBlockImageCount === undefined ||
                  subcategoryBlockImageCount === null
                  ? "0"
                  : String(subcategoryBlockImageCount),
                10
              );
              const filesMap = req.files || {};
              if (imgCount > 0 && blobStorage.isConfigured()) {
                for (let i = 0; i < imgCount; i++) {
                  const slot = filesMap[`subcategoryBlockImages_${i}`];
                  const entry = Array.isArray(slot) ? slot[0] : slot;
                  if (!entry) continue;
                  let fileUrl = null;
                  try {
                    const uploaded = await blobStorage.uploadFile(
                      entry,
                      `categories/${folderName}/subcategory-content-blocks`
                    );
                    fileUrl = uploaded?.url || null;
                  } catch (uploadErr) {
                    console.error(
                      "[updateProductsubCategory] subcategory block file upload failed",
                      uploadErr
                    );
                  }
                  if (fileUrl) {
                    replaceFileReferenceInBlocks(
                      blocksArray,
                      `__FILE_REFERENCE__${i}__`,
                      fileUrl
                    );
                  }
                }
              }
              parsedSubcategoryContentBlocks =
                blocksArray.length > 0 ? blocksArray : [];
            }
          }

          let newMetasubCategoryArray = [...productCategory.metasubCategory];

          // Ensure the metasubCategory array can hold the updated index
          while (newMetasubCategoryArray.length <= subCategoryIndex) {
            newMetasubCategoryArray.push({
              subcategoryName: null,
              metaTitle: null,
              metaDescription: null,
              metaKeywords: null,
              metaSchemas: [],
              subCategoryIndex: subCategoryIndex,
              banner: null,
              content: null,
              content_blocks: [],
            });
          }

          // Delete old banner if new one is uploaded
          if (bannerImage && newMetasubCategoryArray[subCategoryIndex]?.banner?.url) {
            await blobStorage.deleteFile(newMetasubCategoryArray[subCategoryIndex].banner.url);
          }

          // Update the specific subcategory metadata
          const prevMeta = newMetasubCategoryArray[subCategoryIndex] || {};
          let nextContent =
            subCategoryData.content !== undefined
              ? subCategoryData.content
              : prevMeta.content;
          const nextContentBlocks =
            parsedSubcategoryContentBlocks !== undefined
              ? parsedSubcategoryContentBlocks
              : prevMeta.content_blocks || [];

          newMetasubCategoryArray[subCategoryIndex] = {
            subcategoryName:
              subCategoryData.subcategoryName ||
              prevMeta.subcategoryName,
            metaTitle:
              subCategoryData.metaTitle !== undefined ? subCategoryData.metaTitle :
              prevMeta.metaTitle,
            metaDescription:
              subCategoryData.metaDescription !== undefined ? subCategoryData.metaDescription :
              prevMeta.metaDescription,
            metaKeywords:
              subCategoryData.metaKeywords !== undefined ? subCategoryData.metaKeywords :
              prevMeta.metaKeywords,
            metaSchemas:
              subCategoryData.metaSchemas ||
              prevMeta.metaSchemas,
            content: nextContent,
            content_blocks: nextContentBlocks,
            subCategoryIndex: subCategoryIndex,
            banner:
              bannerImage || prevMeta.banner,
          };

          if (
            Array.isArray(newMetasubCategoryArray[subCategoryIndex].content_blocks) &&
            newMetasubCategoryArray[subCategoryIndex].content_blocks.length > 0
          ) {
            newMetasubCategoryArray[subCategoryIndex].content = "";
          }

          productCategory.metasubCategory = newMetasubCategoryArray; // Set the updated array back to the category
        }

        // Save the updated product category
        const updatedProductCategory = await productCategory.save();

        return res.status(201).json({
          message: "Product category updated successfully",
          category: updatedProductCategory,
          status: 201,
        });
      });
    } catch (error) {
      console.error("Error in updating product category:", error);
      return res
        .status(500)
        .json({ error: "Failed to update product category", status: 500 });
    }
  },
  createProductSubCategory: async (req, res) => {
    try {
      console.log(req.body);

      // Extract data from the request body
      const { categoryId, subCategories } = req.body;

      // Retrieve the category by its ID
      const category = await ProductCategory.findById(categoryId);

      // Check if the category exists
      if (!category) {
        return res.json({ message: "Category not found", status: 404 });
      }
      console.log(category);

      category.subCategory = [];

      // Update the subCategory array with new subcategories
      category.subCategory = subCategories;

      // Update the updatedAt field
      category.updatedAt = Date.now();

      // Save the updated category back to the database
      const updatedCategory = await category.save();
      console.log(updatedCategory);
      // Return success response
      return res.json({
        message: "Product sub category created successfully",
        updatedCategory,
        status: 201,
      });
    } catch (error) {
      // Log error
      console.error("Error creating product sub category:", error);
      // Return error response
      return res.json({
        error: "Failed to create product sub category",
        status: 500,
      });
    }
  },
  getCategoryDetailsById: async (req, res) => {
    try {
      // Extract categoryId from request parameters
      const { id } = req.params;
      console.log(id);

      // Check if id is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.json({ message: "Invalid ID format", status: 400 });
      }

      // Retrieve the category by its ID
      const category = await ProductCategory.findById(id);

      // Check if the category exists
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      // Return success response
      return res.json({
        message: "Category fetched successfully",
        category,
        status: 201,
      });
    } catch (error) {
      // Log error
      console.error("Error fetching category:", error);
      // Return error response
      return res.json({ error: "Failed to fetch category", status: 500 });
    }
  },
  createCategoryForNavbar: async (req, res) => {
    try {
      if (!req.body || !Array.isArray(req.body)) {
        return res
          .status(400)
          .json({ error: "Request body must be an array", status: 400 });
      }

      if (req.body.length > MAX_NAVBAR_ITEMS) {
        return res.status(400).json({
          error: `At most ${MAX_NAVBAR_ITEMS} navbar items allowed`,
          status: 400,
        });
      }

      await Navbar.deleteMany({});

      if (req.body.length === 0) {
        return res.status(201).json({
          message: "Navbar cleared successfully",
          status: 201,
        });
      }

      const navbarItems = [];
      for (let i = 0; i < req.body.length; i++) {
        const row = req.body[i];
        const order =
          typeof row.order === "number" ? row.order : i + 1;

        const isCustom =
          row.itemType === "custom" ||
          (row.customLabel != null && row.customPath != null);

        if (isCustom) {
          const label = sanitizeNavCustomLabel(
            row.customLabel != null ? row.customLabel : row.label
          );
          const pathRes = normalizeNavCustomPath(
            row.customPath != null ? row.customPath : row.path
          );
          if (!label) {
            return res.status(400).json({
              error: `Row ${i + 1}: custom label is required`,
              status: 400,
            });
          }
          if (!pathRes.ok) {
            return res.status(400).json({
              error: `Row ${i + 1} (${label}): ${pathRes.message}`,
              status: 400,
            });
          }
          navbarItems.push({
            itemType: "custom",
            categoryId: null,
            customLabel: label,
            customPath: pathRes.value,
            order,
          });
        } else {
          const id = row._id || row.categoryId;
          if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
            return res.status(400).json({
              error: `Row ${i + 1}: valid category _id is required`,
              status: 400,
            });
          }
          navbarItems.push({
            itemType: "category",
            categoryId: id,
            customLabel: "",
            customPath: "",
            order,
          });
        }
      }

      await Navbar.insertMany(navbarItems);

      return res.status(201).json({
        message: "Navbar order saved successfully",
        status: 201,
      });
    } catch (error) {
      console.error("Error saving navbar order:", error);
      return res.json({
        error: "Failed to save navbar order",
        status: 500,
      });
    }
  },
  getCategoryForNavbar: async (req, res) => {
    try {
      const navbarItems = await Navbar.find({})
        .sort({ order: 1 })
        .populate({
          path: "categoryId",
          select:
            "_id name isPublish isFeatured subCategory Logo bannerImage",
        });

      const data = [];

      for (const item of navbarItems) {
        const type =
          item.itemType === "custom" ? "custom" : "category";

        if (type === "custom") {
          data.push({
            itemType: "custom",
            _id: item._id,
            label: item.customLabel || "",
            path: item.customPath || "",
            order: item.order,
            subCategory: [],
          });
          continue;
        }

        if (!item.categoryId) {
          continue;
        }

        data.push({
          itemType: "category",
          _id: item.categoryId._id,
          name: item.categoryId.name,
          isPublish: item.categoryId.isPublish,
          isFeatured: item.categoryId.isFeatured,
          subCategory: item.categoryId.subCategory || [],
          Logo: item.categoryId.Logo,
          bannerImage: item.categoryId.bannerImage,
          order: item.order,
        });
      }

      return res.json({
        message: "Navbar items fetched successfully",
        data,
        status: 201,
      });
    } catch (error) {
      console.error("Error fetching navbar categories:", error);
      return res.json({
        error: "Failed to fetch navbar categories",
        status: 500,
      });
    }
  },
  
  getCategoryById: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(req.params);

      const category = await ProductCategory.findById(id);

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      return res.json({
        message: "Category fetched successfully",
        category,
        status: 201,
      });
    } catch (error) {
      console.error("Error fetching category:", error);
      return res.json({ error: "Failed to fetch category", status: 500 });
    }
  },
  getCategoryDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const category = await ProductCategory.findOne({ "name": id })
        .select('_id bannerImage name metaTitle metaSchemas metaKeywords metaDescription isPublish isFeatured createdAt updatedAt');
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      return res.json({
        message: "Category fetched successfully",
        category,
        status: 201,
      });
    } catch (error) {
      console.error("Error fetching category:", error);
      return res.json({ error: "Failed to fetch category", status: 500 });
    }
  },


  getCategoryDetailsfull: async (req, res) => {
    try {
      const { id } = req.params;
      console.log("req.params", req.params);

      const category = await ProductCategory.findOne({ "name": id })
        .select('_id bannerImage name metaTitle metaSchemas metaKeywords metaDescription content content_blocks');
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      return res.json({
        message: "Category fetched successfully",
        category,
        status: 201,
      });
    } catch (error) {
      console.error("Error fetching category:", error);
      return res.json({ error: "Failed to fetch category", status: 500 });
    }
  },
  getSubCategoryDetails: async (req, res) => {
    try {
        const { name } = req.params; // Get the subcategory name from params
        console.log(name);

        // Fetch all categories
        const categories = await ProductCategory.find();

        let subCategory = null;
        let subCategoryMeta = null;
        let parentCategory = '';

        // Find the subcategory and its meta details across all categories
        for (const category of categories) {
            const idx = category.subCategory.findIndex(
                (sub) =>
                    sub &&
                    normalizeSubcategorySlug(sub) === normalizeSubcategorySlug(name)
            );
            console.log("category", category);

            if (idx >= 0) {
                subCategory = category.subCategory[idx];
                subCategoryMeta =
                    category.metasubCategory?.[idx] ||
                    category.metasubCategory?.find(
                        (meta) => Number(meta?.subCategoryIndex) === idx
                    ) ||
                    category.metasubCategory?.find(
                        (meta) =>
                            meta?.subcategoryName &&
                            normalizeSubcategorySlug(meta.subcategoryName) ===
                                normalizeSubcategorySlug(name)
                    );
                parentCategory = category.bannerImage ?? "";
                break;
            }
        }

        // If subcategory or subcategory meta is not found, return 404
        if (!subCategory || !subCategoryMeta) {
            return res.status(200).json({
                message: "subcategory or subcategory meta is not found",
                subCategory: '',
                subcategoryName: '',
                subCategoryIndex: '',
                metaTitle: '',
                metaDescription: '',
                metaKeywords: '',
                banner: '',
                status: 200,
            });
        }

        // Prefer subcategory-specific banner (admin uploads); fall back to parent category image
        const subBanner = subCategoryMeta.banner;
        const resolvedBanner =
          subBanner && (subBanner.url || subBanner.path)
            ? subBanner
            : parentCategory || "";

        // Structure the response to return the subcategory and meta details in the required format
        const response = {
            message: "Subcategory fetched successfully",
            subCategory: subCategory,
            subcategoryName: subCategoryMeta.subcategoryName,
            subCategoryIndex: subCategoryMeta.subCategoryIndex,
            metaTitle: subCategoryMeta.metaTitle,
            metaDescription: subCategoryMeta.metaDescription,
            metaKeywords: subCategoryMeta.metaKeywords,
            banner: resolvedBanner,
            status: 200,
        };

        // Return the response
        return res.json(response);

    } catch (error) {
        console.error("Error fetching subcategory:", error);
        return res.status(500).json({ error: "Failed to fetch subcategory", status: 500 });
    }
  },
  getSubCategoryDetailsSome: async (req, res) => {
    try {
      const { name } = req.params;
      console.log(name);

      // Fetch all categories
      const categories = await ProductCategory.find();

      let subCategory = null;
      let subCategoryMeta = null;
      let parentCategory = '';
      let subCategoryIndex = null;

      // Find the subcategory and its meta details across all categories
      for (const category of categories) {
          const idx = category.subCategory.findIndex(
              (sub) =>
                  sub &&
                  normalizeSubcategorySlug(sub) === normalizeSubcategorySlug(name)
          );

          if (idx >= 0) {
              subCategory = category.subCategory[idx];
              subCategoryIndex = idx;
              subCategoryMeta =
                  category.metasubCategory?.[idx] ||
                  category.metasubCategory?.find(
                      (meta) => Number(meta?.subCategoryIndex) === idx
                  ) ||
                  category.metasubCategory?.find(
                      (meta) =>
                          meta?.subcategoryName &&
                          normalizeSubcategorySlug(meta.subcategoryName) ===
                              normalizeSubcategorySlug(name)
                  );
              parentCategory = category.bannerImage ?? "";
              break;
          }
      }

 
      if (!subCategory || !subCategoryMeta) {
          return res.status(200).json({
              message:  "Subcategory fetched successfully",
              subcategoryDetails: {
                subcategoryName: name,
                subCategoryIndex: subCategoryIndex,
                metaTitle: '',
                metaDescription: '',
                metaKeywords: '',
                banner: parentCategory,
                metaSchemas: '',
                content: '',
                content_blocks: [],
              },
              status: 200,
          });
      }


      // Prefer subcategory-specific banner (Product Central uploads); fall back to parent category image
      const subBanner = subCategoryMeta.banner;
      const resolvedBanner =
        subBanner && (subBanner.url || subBanner.path)
          ? subBanner
          : parentCategory || "";

      // Structure the response to return the subcategory and meta details in the required format
      const response = {
          message: "Subcategory fetched successfully",
          subcategoryDetails: {
              subcategoryName: subCategoryMeta.subcategoryName || '',
              subCategoryIndex: subCategoryIndex ,
              metaTitle: subCategoryMeta.metaTitle  || '',
              metaDescription: subCategoryMeta.metaDescription  || '',
              metaKeywords: subCategoryMeta.metaKeywords || '',
              metaSchemas: subCategoryMeta.metaSchemas || '',
              content: subCategoryMeta.content || '',
              content_blocks: subCategoryMeta.content_blocks || [],
              banner: resolvedBanner,
          },
          status: 200,
      };

      // Return the response
      return res.json(response);

  } catch (error) {
      console.error("Error fetching subcategory:", error);
      return res.status(500).json({ error: "Failed to fetch subcategory", status: 500 });
    }
  },

  getCategoryCounts: async (req, res) => {
    try {
      // Import the Product model
      const Product = require('../models/product');

      // Define allowed categories
      const allowedCategories = [
        "Mobile-Phones",
        "iPads-and-Tablets",
        "Game-Consoles",
        "Laptops-and-Macbooks"
      ];

      // Get categories from query or use allowed categories
      const requestedCategories = req.query.categories
        ? req.query.categories.split(',').map(cat => cat.trim())
        : allowedCategories;

      // Filter to only include allowed categories
      const categoriesToFetch = requestedCategories.filter(cat =>
        allowedCategories.includes(cat)
      );

      // Get specified active and published categories
      const categories = await ProductCategory.find(
        {
          isPublish: true,
          name: { $in: categoriesToFetch }
        },
        'name _id subCategory'
      );

      // Get counts for each category using aggregation pipeline
      const categoryCounts = await Promise.all(
        categories.map(async (category) => {
          // Count products for main category - handle comma-separated category values
          const mainCategoryCount = await Product.countDocuments({
            category: { $regex: new RegExp(`\\b${category.name}\\b`, 'i') },
            status: true,
            isdeleted: { $ne: true }
          });

          // Count products for each subcategory if they exist
          const subCategoryCounts = category.subCategory ?
            await Promise.all(
              category.subCategory.map(async (subCat) => {
                // Handle JSON string format for subcategory
                const count = await Product.countDocuments({
                  $or: [
                    { subCategory: { $regex: new RegExp(`\\b${subCat}\\b`, 'i') } },
                    { subCategory: { $regex: new RegExp(`"${subCat}"`, 'i') } }
                  ],
                  status: true,
                  isdeleted: { $ne: true }
                });
                return {
                  name: subCat,
                  count: count
                };
              })
            ) : [];

          return {
            categoryId: category._id,
            categoryName: category.name,
            totalProducts: mainCategoryCount,
            subCategories: subCategoryCounts
          };
        })
      );

      return res.json({
        success: true,
        message: "Category counts fetched successfully",
        categoryCounts,
        status: 200
      });

    } catch (error) {
      console.error("Error fetching category counts:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch category counts",
        status: 500
      });
    }
  },



};

module.exports = productCategoriescontroller;
