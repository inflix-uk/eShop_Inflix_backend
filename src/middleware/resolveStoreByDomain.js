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

function getEnvFrontendDomain() {
  let raw = String(process.env.FRONTEND_URL || "")
    .trim()
    .replace(/^\uFEFF/, "");
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }
  if (!raw) return "";
  return normalizeDomain(raw);
}

async function resolveStoreByDomain(req, res, next) {
  try {
    const headerCandidates = [
      req.headers["x-store-domain"],
      req.headers["x-forwarded-host"],
      req.headers.host,
    ];
    const envDomain = getEnvFrontendDomain();
    const domains = [...headerCandidates, envDomain]
      .map(normalizeDomain)
      .filter(Boolean);
    const uniqueDomains = [...new Set(domains)];

    if (uniqueDomains.length === 0) {
      return res.status(404).json({ message: "Store not found for domain" });
    }

    const store = await Store.findOne({
      isActive: true,
      $or: [
        { primaryDomain: { $in: uniqueDomains } },
        { domains: { $in: uniqueDomains } },
      ],
    }).lean();

    if (!store && envDomain) {
      const envStore = await Store.findOne({
        isActive: true,
        $or: [{ primaryDomain: envDomain }, { domains: envDomain }],
      }).lean();
      if (envStore) {
        req.store = envStore;
        return next();
      }
    }

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
