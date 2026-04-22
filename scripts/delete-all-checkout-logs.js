// HARD-DELETE every entry in the checkoutlogs collection. Irreversible.
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const CheckoutLog = require('../src/models/checkoutLog');

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected. DB:', mongoose.connection.name);

  const before = await CheckoutLog.countDocuments();
  console.log('CheckoutLogs before delete:', before);

  const result = await CheckoutLog.deleteMany({});
  console.log('deleteMany result:', result);

  const after = await CheckoutLog.countDocuments();
  console.log('CheckoutLogs after delete:', after);

  await mongoose.disconnect();
})().catch((err) => {
  console.error('Delete failed:', err.message);
  process.exit(1);
});
