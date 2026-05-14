const Products = require("../models/product");
const ProductCategory = require("../models/productCategories");
const Blog = require("../models/blog");
const { Blog: NewBlog } = require("../models/newblog/newBlog");
const generateSitemapXML = require("../utils/generateSitemapXML");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** First value for comma-separated hop headers (e.g. X-Forwarded-Host). */
function firstHeaderValue(value) {
  if (value == null) return "";
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw).split(",")[0].trim();
}

function parseFrontendUrl(raw) {
  let trimmed = String(raw || "")
    .trim()
    .replace(/^\uFEFF/, "");
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (!trimmed) return null;
  try {
    return new URL(trimmed);
  } catch (_) {
    try {
      return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    } catch (_) {
      return null;
    }
  }
}

/** Host only — used when falling back to header-based base URL. */
function envFrontendHost() {
  const u = parseFrontendUrl(process.env.FRONTEND_URL);
  return u?.host || "";
}

/** Full origin (https://domain) — preferred for <loc> when FRONTEND_URL is set (ignores proxy proto/host). */
function envFrontendOrigin() {
  const u = parseFrontendUrl(process.env.FRONTEND_URL);
  if (!u) return "";
  return u.origin.replace(/\/$/, "");
}

/**
 * Public storefront host for <loc> URLs. Server-to-server calls (Next → API on
 * Vercel) often set x-forwarded-host to the API hostname, matching Host — then
 * we must use x-store-domain (sent by app/sitemap.ts) instead of the API host.
 */
function resolveSitemapPublicHost(req) {
  const configuredHost = envFrontendHost();
  if (configuredHost) return configuredHost;

  const requestHost = firstHeaderValue(req.headers.host);
  const xfHost = firstHeaderValue(req.headers["x-forwarded-host"]);
  const storeDomain = firstHeaderValue(req.headers["x-store-domain"]);
  const explicit = firstHeaderValue(req.headers["x-sitemap-public-host"]);

  const reqL = requestHost.toLowerCase();
  if (explicit && explicit.toLowerCase() !== reqL) {
    return explicit;
  }
  if (xfHost && xfHost.toLowerCase() !== reqL) {
    return xfHost;
  }
  if (storeDomain && storeDomain.toLowerCase() !== reqL) {
    return storeDomain;
  }
  return requestHost;
}

const storefrontSitemapController = {
  sitemapXml: async (req, res) => {
    try {
      if (!req.store?._id) {
        return res.status(404).json({ message: "Store not found for domain" });
      }

      const storeId = req.store._id;
      const envOrigin = envFrontendOrigin();
      const host = resolveSitemapPublicHost(req);
      const protocol = firstHeaderValue(req.headers["x-forwarded-proto"]) || "https";
      const baseUrl = envOrigin || `${protocol}://${host}`;

      const [products, categories, blogs, newBlogs] = await Promise.all([
        Products.find({ storeId, isdeleted: false })
          .select("producturl variantValues productType updatedAt")
          .lean(),
        ProductCategory.find({ storeId })
          .select("name slug subCategory updatedAt")
          .lean(),
        Blog.find({ storeId }).select("name updatedAt").lean(),
        NewBlog.find({ storeId, publishStatus: "published" })
          .select("slug updatedAt")
          .lean(),
      ]);

      const urls = [];
      urls.push({
        loc: `${baseUrl}/`,
        changefreq: "daily",
        priority: 1.0,
      });
      urls.push({
        loc: `${baseUrl}/categories`,
        changefreq: "monthly",
        priority: 0.8,
      });
      urls.push({
        loc: `${baseUrl}/subcategory`,
        changefreq: "weekly",
        priority: 0.9,
      });

      products.forEach((product) => {
        const productSlug = (product.producturl || "").replace(/-\d{13}$/, "");
        if (!productSlug) return;
        urls.push({
          loc: `${baseUrl}/products/${productSlug}`,
          changefreq: "weekly",
          priority: 0.7,
          lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString() : undefined,
        });

        if (product.productType?.type !== "single" && Array.isArray(product.variantValues)) {
          product.variantValues.forEach((variant) => {
            const variantSlug = variant.slug || slugify(variant.name || "");
            if (!variantSlug) return;
            urls.push({
              loc: `${baseUrl}/products/${productSlug}-${variantSlug}`,
              changefreq: "weekly",
              priority: 0.7,
              lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString() : undefined,
            });
          });
        }
      });

      categories.forEach((category) => {
        const categorySlug = category.slug || slugify(category.name || "");
        if (!categorySlug) return;
        urls.push({
          loc: `${baseUrl}/categories/${categorySlug}`,
          changefreq: "monthly",
          priority: 0.6,
          lastmod: category.updatedAt ? new Date(category.updatedAt).toISOString() : undefined,
        });

        if (Array.isArray(category.subCategory)) {
          category.subCategory.forEach((sub) => {
            const subSlug = slugify(sub || "");
            if (!subSlug) return;
            urls.push({
              loc: `${baseUrl}/subcategory/${subSlug}`,
              changefreq: "monthly",
              priority: 0.5,
              lastmod: category.updatedAt ? new Date(category.updatedAt).toISOString() : undefined,
            });
          });
        }
      });

      blogs.forEach((blog) => {
        const blogSlug = slugify(blog.name || "");
        if (!blogSlug) return;
        urls.push({
          loc: `${baseUrl}/blogs/${blogSlug}`,
          changefreq: "monthly",
          priority: 0.7,
          lastmod: blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
        });
      });

      newBlogs.forEach((blog) => {
        if (!blog.slug) return;
        urls.push({
          loc: `${baseUrl}/blogs/new/${blog.slug}`,
          changefreq: "monthly",
          priority: 0.7,
          lastmod: blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
        });
      });

      const xml = generateSitemapXML(urls);
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
      return res.status(200).send(xml);
    } catch (error) {
      console.error("storefront sitemap error:", error);
      return res.status(500).json({ message: "Failed to generate sitemap" });
    }
  },
};

module.exports = storefrontSitemapController;
