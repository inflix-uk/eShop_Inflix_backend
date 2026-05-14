const mongoose = require("mongoose");

const superadminControlsSchema = new mongoose.Schema(
  {
    routeBlockingEnabled: {
      type: Boolean,
      default: true,
    },
    disabledMarketingRoutes: {
      type: [String],
      default: [],
    },
    disabledAdminRoutes: {
      type: [String],
      default: [],
    },
    adminRouteModules: {
      type: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          description: { type: String, default: "" },
          routes: { type: [String], default: [] },
          enabled: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SuperadminControls", superadminControlsSchema);
