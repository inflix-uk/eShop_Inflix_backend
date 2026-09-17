require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  console.log('DB NAME:', db.databaseName);
  const doc = await db.collection('navbarvarianttest').findOne({});
  if (!doc) {
    console.log('NO navbarvarianttest DOC');
  } else {
    console.log('ACTIVE CONFIG:', JSON.stringify(doc.config, null, 2));
    console.log('PRESET KEYS:', Object.keys(doc.presets || {}));
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
