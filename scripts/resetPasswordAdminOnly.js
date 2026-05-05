require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../src/models/user");

(async () => {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error("Usage: node scripts/resetPasswordAdminOnly.js <email> <newPassword>");
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error("Missing MONGO_URI (or DATABASE_URL) in environment.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`User not found: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (user.role !== "admin") {
    console.error(
      `Refused: role is "${user.role}", not "admin". Password not changed.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  const verify = await User.findOne({ email });
  const ok = await bcrypt.compare(newPassword, verify.password);

  console.log("Password reset successful.");
  console.log("email:", email);
  console.log("role:", user.role);
  console.log("verify compare:", ok);

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});