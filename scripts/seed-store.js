/**
 * Create the storefront Store record required for /sitemap.xml (resolveStoreByDomain).
 *
 * Usage:
 *   node scripts/seed-store.js podcaststudiomanchester.uk "Podcast Studio Manchester"
 *   node scripts/seed-store.js aromadesire.com "Aroma Desire" www.aromadesire.com
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Store = require("../src/models/store");

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
  const primary = normalizeDomain(process.argv[2] || process.env.FRONTEND_URL);
  const name = process.argv[3] || primary;
  const extraDomains = process.argv.slice(4).map(normalizeDomain).filter(Boolean);

  if (!primary) {
    console.error("Usage: node scripts/seed-store.js <primaryDomain> [name] [extra domains...]");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const domains = [...new Set(extraDomains.filter((d) => d && d !== primary))];

  let store = await Store.findOne({ primaryDomain: primary });
  if (store) {
    store.name = name;
    store.isActive = true;
    store.domains = [...new Set([...(store.domains || []), ...domains])];
    await store.save();
    console.log("Updated store:", store.primaryDomain, store._id.toString());
  } else {
    store = await Store.create({
      name,
      primaryDomain: primary,
      domains,
      isActive: true,
    });
    console.log("Created store:", store.primaryDomain, store._id.toString());
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
