const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    primaryDomain: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    domains: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

storeSchema.pre("save", function normalizeDomains(next) {
  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(":")[0]
      .replace(/\/+$/, "");

  this.primaryDomain = normalize(this.primaryDomain);
  this.domains = (Array.isArray(this.domains) ? this.domains : [])
    .map(normalize)
    .filter(Boolean);
  next();
});

module.exports = mongoose.model("Store", storeSchema);
