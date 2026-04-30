const Store = require("../models/store");

function normalizeDomain(rawHost = "") {
  return String(rawHost || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
}

async function resolveStoreByDomain(req, res, next) {
  try {
    const host = normalizeDomain(
      req.headers["x-store-domain"] ||
        req.headers["x-forwarded-host"] ||
        req.headers.host
    );
    if (!host) {
      return res.status(404).json({ message: "Store not found for domain" });
    }

    const store = await Store.findOne({
      isActive: true,
      $or: [{ primaryDomain: host }, { domains: host }],
    }).lean();

    if (!store) {
      return res.status(404).json({ message: "Store not found for domain" });
    }

    req.store = store;
    return next();
  } catch (error) {
    console.error("resolveStoreByDomain error:", error);
    return res.status(500).json({ message: "Failed to resolve store" });
  }
}

module.exports = resolveStoreByDomain;
