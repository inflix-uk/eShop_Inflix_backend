const db = require("../../connections/mongo");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Order = require("../models/order");
const Blog = require("../models/blog");
const { Blog: NewBlog } = require("../models/newblog/newBlog");
const Products = require("../models/product");
const productCategory = require("../models/productCategories");
const Newsletter = require("../models/newsletter");
const crypto = require("crypto");

const siteMapController = {
  createSitemap: async (req, res) => {
    try {
      const products = await Products.find({ isdeleted: false });
      const categories = await productCategory.find({});
      const blogs = await Blog.find({});
      const newblogs = await NewBlog.find({ publishStatus: "published" }).select("slug");

      const productUrls = products.flatMap((product) => {
        const productNameSlug = (product.producturl || "").replace(/-\d{13}$/, "");
        if (product.productType?.type === "single") {
          return [
            {
              url: `https://zextons.co.uk/products/${productNameSlug}`,
              changefreq: "weekly",
              priority: 0.7,
            },
          ];
        } else {
          // Add base product URL first
          const baseUrl = {
            url: `https://zextons.co.uk/products/${productNameSlug}`,
            changefreq: "weekly",
            priority: 0.8,
          };

          // Then add all variant URLs
          const variantUrls = product.variantValues.map((variant) => {
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
            return {
              url: `https://zextons.co.uk/products/${fullProductNameSlug}`,
              changefreq: "weekly",
              priority: 0.7,
            };
          });

          // Return base URL + all variant URLs
          return [baseUrl, ...variantUrls];
        }
      });

      const categoryUrls = categories.map((category) => {
        const categorySlug = category.name.replace(/\s+/g, "-");
        return {
          url: `https://zextons.co.uk/categories/${categorySlug}`,
          changefreq: "monthly",
          priority: 0.6,
        };
      });

      const subcategoryUrls = categories.flatMap((category) => {
        if (category.subCategory && Array.isArray(category.subCategory)) {
          return category.subCategory.map((subCat) => {
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

      const blogUrls = blogs.map((blog) => {
        const blogSlug = blog.name.replace(/\s+/g, "-").toLowerCase();
        return {
          url: `https://zextons.co.uk/blogs/${blogSlug}`,
          changefreq: "monthly",
          priority: 0.7,
        };
      });
      const newblogUrls = newblogs.map((newblog) => {
        const blogSlug = newblog.slug;
        return {
          url: `https://zextons.co.uk/blogs/new/${blogSlug}`, // Correct double slash in URL
          changefreq: "monthly",
          priority: 0.7,
        };
      });

      const urls = [
        ...productUrls,
        ...categoryUrls,
        ...subcategoryUrls,
        ...blogUrls,
        ...newblogUrls,
        { url: "/", changefreq: "daily", priority: 1.0 },
        { url: "/categories", changefreq: "monthly", priority: 0.8 },
        { url: "/subcategory", changefreq: "weekly", priority: 0.9 },
      ];

      res.json(urls);
    } catch (error) {
      console.error("createSitemap error:", error);
      res.status(500).send("Error fetching URLs");
    }
  },
};

module.exports = siteMapController;
