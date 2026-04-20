const db = require("../../connections/mongo");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Order = require("../models/order");
const Blog = require("../models/blog");
const { Blog: NewBlog } = require("../models/newblog/newBlog");
const Products = require("../models/product");
const productCategory = require("../models/productCategories");
const Newsletter = require("../models/newsletter");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const optimizedSitemapController = {
  createSitemapOptimized: async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Set response timeout to 90 seconds (before Cloudflare's 100s limit)
      req.setTimeout(90000, () => {
        if (!res.headersSent) {
          res.status(524).json({ error: "Request timeout", message: "Sitemap generation exceeded time limit" });
        }
      });

      const BATCH_SIZE = 1000;
      const MAX_URLS = 50000;
      let allUrls = [];
      
      // Static URLs - always include these first
      const staticUrls = [
        { url: "/", changefreq: "daily", priority: 1.0 },
        { url: "/categories", changefreq: "monthly", priority: 0.8 },
        { url: "/subcategory", changefreq: "weekly", priority: 0.9 },
      ];
      allUrls.push(...staticUrls);

      // Process categories first (lightweight)
      console.log("Processing categories...");
      const categories = await productCategory.find({}).lean().limit(100);
      
      const categoryUrls = categories.map((category) => {
        const categorySlug = category.name.replace(/\s+/g, "-");
        return {
          url: `https://zextons.co.uk/categories/${categorySlug}`,
          changefreq: "monthly",
          priority: 0.6,
        };
      });
      allUrls.push(...categoryUrls);

      const subcategoryUrls = categories.flatMap((category) => {
        if (category.subCategory && Array.isArray(category.subCategory)) {
          return category.subCategory.slice(0, 20).map((subCat) => {
            const subCatSlug = subCat.replace(/\s+/g, "-");
            return {
              url: `https://zextons.co.uk/subcategory/${subCatSlug}`,
              changefreq: "monthly",
              priority: 0.6,
            };
          });
        }
        return [];
      });
      allUrls.push(...subcategoryUrls);

      // Process blogs in batches
      console.log("Processing blogs...");
      let blogSkip = 0;
      const blogBatchSize = 500;
      
      while (allUrls.length < MAX_URLS) {
        const blogs = await Blog.find({})
          .select("name")
          .lean()
          .skip(blogSkip)
          .limit(blogBatchSize);
          
        if (blogs.length === 0) break;
        
        const blogUrls = blogs.map((blog) => {
          const blogSlug = blog.name.replace(/\s+/g, "-").toLowerCase();
          return {
            url: `https://zextons.co.uk/blogs/${blogSlug}`,
            changefreq: "monthly",
            priority: 0.7,
          };
        });
        
        allUrls.push(...blogUrls);
        blogSkip += blogBatchSize;
        
        if (Date.now() - startTime > 85000) {
          console.log("Timeout approaching, stopping blog processing");
          break;
        }
      }

      // Process new blogs
      console.log("Processing new blogs...");
      if (allUrls.length < MAX_URLS && Date.now() - startTime < 80000) {
        const newblogs = await NewBlog.find({ publishStatus: "published" })
          .select("slug")
          .lean()
          .limit(1000);
          
        const newblogUrls = newblogs.map((newblog) => {
          const blogSlug = newblog.slug;
          return {
            url: `https://zextons.co.uk/blogs/new/${blogSlug}`,
            changefreq: "monthly",
            priority: 0.7,
          };
        });
        
        allUrls.push(...newblogUrls);
      }

      // Process products in batches (most resource intensive)
      console.log("Processing products...");
      let productSkip = 0;
      const productBatchSize = 200;
      
      while (allUrls.length < MAX_URLS && Date.now() - startTime < 75000) {
        const products = await Products.find({ isdeleted: false })
          .select("producturl productType variantValues")
          .lean()
          .skip(productSkip)
          .limit(productBatchSize);
          
        if (products.length === 0) break;

        const productUrls = [];
        for (const product of products) {
          if (allUrls.length + productUrls.length >= MAX_URLS) break;
          
          const productNameSlug = (product.producturl || "").replace(/-\d{13}$/, "");
          if (product.productType?.type === "single") {
            productUrls.push({
              url: `https://zextons.co.uk/products/${productNameSlug}`,
              changefreq: "weekly",
              priority: 0.7,
            });
          } else if (product.variantValues) {
            // Limit variants to prevent memory issues
            const limitedVariants = product.variantValues.slice(0, 10);
            for (const variant of limitedVariants) {
              if (allUrls.length + productUrls.length >= MAX_URLS) break;

              // Use the new SEO-friendly slug field if available, otherwise fallback to name conversion
              let variantSlug;
              if (variant.slug) {
                variantSlug = variant.slug;
              } else {
                // Fallback: convert variant name to SEO slug (replace underscores with hyphens)
                variantSlug = (variant.name || "")
                  .toLowerCase()
                  .replace(/_/g, "-")
                  .replace(/[^a-z0-9-]+/g, "-")
                  .replace(/^-+|-+$/g, "")
                  .replace(/-+/g, "-");
              }

              const fullProductNameSlug = `${productNameSlug}-${variantSlug}`;
              productUrls.push({
                url: `https://zextons.co.uk/products/${fullProductNameSlug}`,
                changefreq: "weekly",
                priority: 0.7,
              });
            }
          }
        }
        
        allUrls.push(...productUrls);
        productSkip += productBatchSize;
        
        console.log(`Processed ${productSkip} products, total URLs: ${allUrls.length}`);
        
        if (Date.now() - startTime > 70000) {
          console.log("Timeout approaching, stopping product processing");
          break;
        }
      }

      // Truncate if necessary
      if (allUrls.length > MAX_URLS) {
        allUrls = allUrls.slice(0, MAX_URLS);
      }

      console.log(`Optimized sitemap generated with ${allUrls.length} URLs in ${Date.now() - startTime}ms`);
      
      res.json(allUrls);
    } catch (error) {
      console.error("createSitemapOptimized error:", error);
      const errorMessage = error.name === 'MongoTimeoutError' ? 
        "Database timeout - try again" : 
        "Error fetching URLs";
      res.status(500).json({ error: errorMessage, details: error.message });
    }
  },
};

module.exports = optimizedSitemapController;