// Seed or update a dedicated superadmin account.
// Default credentials:
//   email: ali@zextons.co.uk
//   password: superAdmin@123
//
// You can override with env vars:
//   SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... node scripts/seedSuperadmin.js

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

const User = require("../src/models/user");

async function seedSuperadmin() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const firstname = process.env.SUPERADMIN_FIRSTNAME;
  const lastname = process.env.SUPERADMIN_LASTNAME;
  const companyname = process.env.SUPERADMIN_COMPANY;

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in environment variables.");
  }

  if (!email || !password || !firstname || !lastname || !companyname) {
    throw new Error(
      "Missing SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, SUPERADMIN_FIRSTNAME, SUPERADMIN_LASTNAME, or SUPERADMIN_COMPANY in environment variables."
    );
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        firstname,
        lastname,
        email,
        password: hashedPassword,
        role: "superadmin",
        roleId: null,
        companyname,
      },
    },
    { new: true, upsert: true }
  );

  const passwordVerify = await bcrypt.compare(password, user.password);

  console.log("Superadmin seeded successfully.");
  console.log("email:", user.email);
  console.log("role:", user.role);
  console.log("password verify:", passwordVerify);
  console.log("userId:", user._id.toString());

  await mongoose.disconnect();
}

seedSuperadmin().catch(async (error) => {
  console.error("Failed to seed superadmin:", error.message);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    // ignore disconnect failure after fatal error
  }
  process.exit(1);
});
