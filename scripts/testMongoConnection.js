require('dotenv').config();
const mongoose = require('mongoose');

const resolveMongoUri = () => {
  const raw = process.env.MONGO_URI || process.env.DATABASE_URL || '';
  const value = String(raw).trim().replace(/^['"]|['"]$/g, '');
  return value.startsWith('mongodb://') || value.startsWith('mongodb+srv://') ? value : null;
};

const uri = resolveMongoUri();
if (!uri) {
  console.error('FAIL: MONGO_URI is missing or invalid');
  process.exit(1);
}

try {
  const parsed = new URL(uri.replace(/^mongodb:\/\//, 'http://'));
  const db = (parsed.pathname || '').replace(/^\//, '') || '(default)';
  console.log(`Target: ${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}/${db}`);
} catch {
  console.log('Target: (could not parse URI host)');
}

mongoose
  .connect(uri, {
    serverSelectionTimeoutMS: 15000,
    directConnection: true,
    family: 4,
  })
  .then(() => {
    console.log('OK: connected to', mongoose.connection.name);
    return mongoose.disconnect();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAIL:', err.message);
    process.exit(1);
  });
