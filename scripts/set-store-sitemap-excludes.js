/**
 * Set per-store sitemap path exclusions (other stores unchanged).
 *
 * Usage:
 *   node scripts/set-store-sitemap-excludes.js podcaststudiomanchester.uk /categories
 *   node scripts/set-store-sitemap-excludes.js aromadesire.com
 *     (no paths → clears exclusions)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Store = require("../src/models/store");
const { normalizeSitemapPath } = require("../src/utils/sitemapStoreExclusions");

function normalizeDomain(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0]
    .replace(/\/+$/, "");
}

async function main() {
  const domain = normalizeDomain(process.argv[2]);
  const paths = process.argv
    .slice(3)
    .map((p) => normalizeSitemapPath(p))
    .filter(Boolean);

  if (!domain) {
    console.error(
      "Usage: node scripts/set-store-sitemap-excludes.js <domain> [/categories ...]"
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const store = await Store.findOne({
    isActive: true,
    $or: [{ primaryDomain: domain }, { domains: domain }],
  });

  if (!store) {
    console.error("Store not found for domain:", domain);
    await mongoose.disconnect();
    process.exit(1);
  }

  store.sitemapExcludePaths = paths;
  await store.save();

  console.log("Updated store:", store.primaryDomain);
  console.log("sitemapExcludePaths:", store.sitemapExcludePaths);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
