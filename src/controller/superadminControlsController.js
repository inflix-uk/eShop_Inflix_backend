const SuperadminControls = require("../models/superadminControls");

const DEFAULT_DISABLED_MARKETING_ROUTES = [
  "subscribe-newsletter",
  "why-buying-a-refurbished-iphone-is-a-good-idea",
  "buy-now-pay-later",
  "customer-reviews",
  "recycle-mobile-phone",
  "sustainability",
  "18-months-warranty",
  "faqs",
  "about-us",
  "deals-and-discounts",
];

const normalizeRouteList = (items) => {
  if (!Array.isArray(items)) return [];
  return [...new Set(items
    .map((item) => String(item || "").trim().replace(/^\/+|\/+$/g, "").toLowerCase())
    .filter(Boolean))];
};

const normalizeModules = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const label = String(item?.label || "").trim();
      if (!label) return null;
      const id = String(item?.id || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-");
      const safeId = id || `module-${Date.now()}`;
      return {
        id: safeId,
        label,
        description: String(item?.description || "").trim(),
        routes: normalizeRouteList(item?.routes),
        enabled: item?.enabled !== false,
      };
    })
    .filter(Boolean);
};

const deriveDisabledRoutesFromModules = (modules) => {
  const disabledRoutes = modules
    .filter((module) => module.enabled === false)
    .flatMap((module) => module.routes || []);
  return normalizeRouteList(disabledRoutes);
};

const toResponse = (doc) => {
  const data = doc?.toObject ? doc.toObject() : doc || {};
  const effectiveRouteBlockingEnabled =
    typeof data.routeBlockingEnabled === "boolean"
      ? data.routeBlockingEnabled
      : data.huskyEnabled !== false;
  return {
    routeBlockingEnabled: effectiveRouteBlockingEnabled,
    disabledMarketingRoutes: normalizeRouteList(data.disabledMarketingRoutes),
    disabledAdminRoutes: normalizeRouteList(data.disabledAdminRoutes),
    adminRouteModules: normalizeModules(data.adminRouteModules),
    updatedAt: data.updatedAt || null,
    createdAt: data.createdAt || null,
  };
};

const getControlsDoc = async () => {
  const doc = await SuperadminControls.findOne();
  if (doc) {
    if (
      typeof doc.routeBlockingEnabled !== "boolean" &&
      typeof doc.huskyEnabled === "boolean"
    ) {
      doc.routeBlockingEnabled = doc.huskyEnabled;
      doc.set("huskyEnabled", undefined, { strict: false });
      await doc.save();
    }
    return doc;
  }
  return SuperadminControls.create({
    routeBlockingEnabled: true,
    disabledMarketingRoutes: DEFAULT_DISABLED_MARKETING_ROUTES,
    disabledAdminRoutes: [],
    adminRouteModules: [],
  });
};

const getSuperadminControls = async (req, res) => {
  try {
    const doc = await getControlsDoc();
    return res.status(200).json({
      success: true,
      data: toResponse(doc),
    });
  } catch (error) {
    console.error("getSuperadminControls:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load superadmin controls",
    });
  }
};

const updateSuperadminControls = async (req, res) => {
  try {
    const {
      routeBlockingEnabled,
      huskyEnabled,
      disabledMarketingRoutes,
      disabledAdminRoutes,
      adminRouteModules,
    } = req.body || {};
    const update = {};

    if (typeof routeBlockingEnabled === "boolean") {
      update.routeBlockingEnabled = routeBlockingEnabled;
    } else if (typeof huskyEnabled === "boolean") {
      update.routeBlockingEnabled = huskyEnabled;
    }
    if (disabledMarketingRoutes !== undefined) {
      update.disabledMarketingRoutes = normalizeRouteList(disabledMarketingRoutes);
    }
    if (disabledAdminRoutes !== undefined) {
      update.disabledAdminRoutes = normalizeRouteList(disabledAdminRoutes);
    }
    if (adminRouteModules !== undefined) {
      const modules = normalizeModules(adminRouteModules);
      update.adminRouteModules = modules;
      update.disabledAdminRoutes = deriveDisabledRoutesFromModules(modules);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field: routeBlockingEnabled, disabledMarketingRoutes, disabledAdminRoutes, adminRouteModules",
      });
    }

    const doc = await SuperadminControls.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Superadmin controls updated",
      data: toResponse(doc),
    });
  } catch (error) {
    console.error("updateSuperadminControls:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update superadmin controls",
    });
  }
};

const getPublicSuperadminControls = async (req, res) => {
  try {
    const doc = await getControlsDoc();
    const data = toResponse(doc);
    return res.status(200).json({
      success: true,
      data: {
        routeBlockingEnabled: data.routeBlockingEnabled,
        disabledMarketingRoutes: data.disabledMarketingRoutes,
        disabledAdminRoutes: data.disabledAdminRoutes,
        adminRouteModules: data.adminRouteModules,
      },
    });
  } catch (error) {
    console.error("getPublicSuperadminControls:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load public controls",
    });
  }
};

module.exports = {
  getSuperadminControls,
  updateSuperadminControls,
  getPublicSuperadminControls,
};
