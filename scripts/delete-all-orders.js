// HARD-DELETE every order in the orders collection. Irreversible.
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Order = require('../src/models/order');

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected. DB:', mongoose.connection.name);

  const before = await Order.countDocuments();
  console.log('Orders before delete:', before);

  const result = await Order.deleteMany({});
  console.log('deleteMany result:', result);

  const after = await Order.countDocuments();
  console.log('Orders after delete:', after);

  await mongoose.disconnect();
})().catch((err) => {
  console.error('Delete failed:', err.message);
  process.exit(1);
});
