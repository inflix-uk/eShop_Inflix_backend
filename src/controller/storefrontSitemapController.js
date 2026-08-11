const Products = require("../models/product");
const ProductCategory = require("../models/productCategories");
const Blog = require("../models/blog");
const { Blog: NewBlog } = require("../models/newblog/newBlog");
const generateSitemapXML = require("../utils/generateSitemapXML");
const generateSitemapProductImagesXML =
  require("../utils/generateSitemapXML").generateSitemapProductImagesXML;
const { getNewBlogSitemapPathSegment } = require("../utils/newBlogSitemapPath");
const { collectSitemapProductImageUrls } = require("../utils/orderLineImageUrlServer");
const { appendFooterPageSitemapEntries } = require("../utils/footerPageSitemapPaths");
const { appendBookingPackageSitemapEntries } = require("../utils/bookingPackageSitemapPaths");
const {
  storeSkipsSitemapCategories,
  storeSkipsSitemapPath,
} = require("../utils/sitemapStoreExclusions");

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

/** Canonical storefront origin for sitemap <loc> (no www — matches https://aromadesire.com/). */
function canonicalSitemapOrigin(raw) {
  const trimmed = String(raw || "")
    .trim()
    .replace(/\/$/, "");
  if (!trimmed) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (u.hostname.toLowerCase().startsWith("www.")) {
      u.hostname = u.hostname.slice(4);
    }
    return u.origin;
  } catch {
    return trimmed;
  }
}

function resolveSitemapBaseUrl(req) {
  const envOrigin = envFrontendOrigin();
  const host = resolveSitemapPublicHost(req);
  const protocol = firstHeaderValue(req.headers["x-forwarded-proto"]) || "https";
  const raw = envOrigin || `${protocol}://${host}`;
  return canonicalSitemapOrigin(raw);
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

function appendProductSitemapEntries(urls, products, baseUrl, changefreq = "weekly") {
  products.forEach((product) => {
    const productSlug = (product.producturl || "").replace(/-\d{13}$/, "");
    if (!productSlug) return;
    const lastmod = product.updatedAt
      ? new Date(product.updatedAt).toISOString()
      : undefined;
    const productImages = collectSitemapProductImageUrls(product, null);
    const productEntry = {
      loc: `${baseUrl}/products/${productSlug}`,
      changefreq,
      priority: 0.7,
      lastmod,
    };
    if (productImages.length > 0) {
      productEntry.images = productImages;
    }
    urls.push(productEntry);

    if (product.productType?.type !== "single" && Array.isArray(product.variantValues)) {
      product.variantValues.forEach((variant) => {
        const variantSlug = variant.slug || slugify(variant.name || "");
        if (!variantSlug) return;
        const variantImages = collectSitemapProductImageUrls(product, variant);
        const variantEntry = {
          loc: `${baseUrl}/products/${productSlug}/${variantSlug}`,
          changefreq,
          priority: 0.7,
          lastmod,
        };
        if (variantImages.length > 0) {
          variantEntry.images = variantImages;
        }
        urls.push(variantEntry);
      });
    }
  });
}

const storefrontSitemapController = {
  sitemapXml: async (req, res) => {
    try {
      if (!req.store?._id) {
        return res.status(404).json({ message: "Store not found for domain" });
      }

      const storeId = req.store._id;
      const baseUrl = resolveSitemapBaseUrl(req);
      const skipCategories = storeSkipsSitemapCategories(req.store);

      const [products, categories, blogs, newBlogs] = await Promise.all([
        Products.find({ storeId, isdeleted: false })
          .select("producturl variantValues productType updatedAt Gallery_Images meta_Image")
          .lean(),
        skipCategories
          ? Promise.resolve([])
          : ProductCategory.find({ storeId }).select("name slug updatedAt").lean(),
        Blog.find({ storeId }).select("name updatedAt").lean(),
        NewBlog.find({ storeId, publishStatus: "published" })
          .select("slug updatedAt categories")
          .populate({ path: "categories", select: "name" })
          .lean(),
      ]);

      const urls = [];
      urls.push({
        loc: `${baseUrl}/`,
        changefreq: "daily",
        priority: 1.0,
      });
      if (!skipCategories) {
        urls.push({
          loc: `${baseUrl}/categories`,
          changefreq: "monthly",
          priority: 0.8,
        });
      }

      await appendFooterPageSitemapEntries(urls, storeId, baseUrl);

      if (!storeSkipsSitemapPath(req.store, "/booking")) {
        await appendBookingPackageSitemapEntries(urls, baseUrl);
      }

      appendProductSitemapEntries(urls, products, baseUrl);

      if (!skipCategories) {
        categories.forEach((category) => {
          const categorySlug = category.slug || slugify(category.name || "");
          if (!categorySlug) return;
          urls.push({
            loc: `${baseUrl}/categories/${categorySlug}`,
            changefreq: "monthly",
            priority: 0.6,
            lastmod: category.updatedAt ? new Date(category.updatedAt).toISOString() : undefined,
          });
        });
      }

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
        const pathSeg = getNewBlogSitemapPathSegment(blog);
        if (!pathSeg) return;
        urls.push({
          loc: `${baseUrl}/${pathSeg}`,
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

  sitemapImagesXml: async (req, res) => {
    try {
      if (!req.store?._id) {
        return res.status(404).json({ message: "Store not found for domain" });
      }

      const storeId = req.store._id;
      const baseUrl = resolveSitemapBaseUrl(req);

      const products = await Products.find({ storeId, isdeleted: false })
        .select("producturl variantValues productType updatedAt Gallery_Images meta_Image")
        .lean();

      const productUrls = [];
      appendProductSitemapEntries(productUrls, products, baseUrl, "daily");

      const xml = generateSitemapProductImagesXML(productUrls);
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
      return res.status(200).send(xml);
    } catch (error) {
      console.error("storefront sitemap-images error:", error);
      return res.status(500).json({ message: "Failed to generate product image sitemap" });
    }
  },
};

module.exports = storefrontSitemapController;
