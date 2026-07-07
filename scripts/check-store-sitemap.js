require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Store = require("../src/models/store");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const stores = await Store.find({}).select("name primaryDomain domains isActive").lean();
  console.log("=== Stores ===");
  console.log(JSON.stringify(stores, null, 2));

  const total = await db.collection("products").countDocuments({ isdeleted: false });
  const withStore = await db.collection("products").countDocuments({
    storeId: { $exists: true, $ne: null },
  });
  const sample = await db
    .collection("products")
    .find({ isdeleted: false })
    .limit(3)
    .project({ producturl: 1, storeId: 1 })
    .toArray();

  console.log("\n=== Products ===");
  console.log("total (not deleted):", total);
  console.log("with storeId:", withStore);
  console.log("sample:", JSON.stringify(sample, null, 2));

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
