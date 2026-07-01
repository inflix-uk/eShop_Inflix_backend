/* Grant ALL admin-panel permissions to a user's role.
 * Usage: node grant-all-permissions.js [email]
 * Default email: ali@inflix.co.uk
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const EMAIL = (process.argv[2] || 'ali@inflix.co.uk').toLowerCase();

const IDS = {
  zextons: [
    'view_dashboard','export_dashboard','view_blogs','manage_blogs','view_media','manage_media',
    'view_products','manage_products','view_product_central','manage_product_central',
    'view_coupons','manage_coupons','view_orders','manage_orders','view_returns','manage_returns',
    'view_return_requests','manage_return_requests','view_messages','manage_messages',
    'view_reviews','manage_reviews','view_users','manage_users','view_subscribers','manage_subscribers',
    'view_deals','manage_deals','view_banners','view_pdf_labels'
  ],
  rolesandPermissions: ['view_roles','manage_roles','view_permissions','manage_permissions'],
  staticMeta: ['view_static_meta','manage_static_meta'],
};
const allTrue = (arr) => arr.reduce((o, id) => (o[id] = true, o), {});
const permissions = {
  zextons: allTrue(IDS.zextons),
  rolesandPermissions: allTrue(IDS.rolesandPermissions),
  staticMeta: allTrue(IDS.staticMeta),
};

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI missing in .env'); process.exit(1); }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // Find user by email (case-insensitive)
  const user = await db.collection('users').findOne({
    email: { $regex: `^${EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
  });
  if (!user) { console.error(`No user found with email ${EMAIL}`); await mongoose.disconnect(); process.exit(1); }
  console.log(`User: ${user.email}  role=${user.role}  roleId=${user.roleId}`);

  if (!user.roleId) {
    console.error('User has no roleId. Assign a role first (via /admin/users edit), then re-run.');
    await mongoose.disconnect(); process.exit(1);
  }

  const roleId = new mongoose.Types.ObjectId(user.roleId);
  const role = await db.collection('roleandpermissons').findOne({ _id: roleId });
  if (!role) { console.error(`Role ${user.roleId} not found in roleandpermissons`); await mongoose.disconnect(); process.exit(1); }
  console.log(`Role before: "${role.name}"`, JSON.stringify(role.permissions));

  const result = await db.collection('roleandpermissons').updateOne(
    { _id: roleId },
    { $set: { permissions, updatedAt: new Date() } }
  );
  console.log(`Update matched=${result.matchedCount} modified=${result.modifiedCount}`);

  const updated = await db.collection('roleandpermissons').findOne({ _id: roleId });
  console.log(`Role after: "${updated.name}" ->`, JSON.stringify(updated.permissions));

  await mongoose.disconnect();
  console.log('\n✅ Done. Ali must log out and back in (or hard-refresh) so the sidebar picks up the new permissions.');
})().catch(async (e) => { console.error('ERROR:', e.message); try { await mongoose.disconnect(); } catch {} process.exit(1); });
