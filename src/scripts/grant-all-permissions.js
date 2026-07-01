/**
 * grant-all-permissions.js
 * ---------------------------------------------------------------------------
 * Grants ALL admin-panel permissions to a user by setting their role's
 * `permissions` object to every permission id = true, under every namespace
 * the admin panel checks (store / zextons / rolesandPermissions / etc.).
 *
 * The admin sidebar + route guards read permissions from the user's ROLE
 * (login attaches `permissions: user.roleId.permissions`). So this updates the
 * role linked to the user; if the user has no role, it creates/assigns an
 * "Administrator" role with full access.
 *
 * Usage (from the backend project root):
 *   node src/scripts/grant-all-permissions.js
 *   node src/scripts/grant-all-permissions.js someone@else.com
 *
 * Requires MONGO_URI (or DATABASE_URL) in the environment / .env.
 * After running, the user must log out and back in to refresh their token.
 * ---------------------------------------------------------------------------
 */

try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }

const mongoose = require('mongoose');
const User = require('../models/user');
const Role = require('../models/roleAndPermissons');

const EMAIL = (process.argv[2] || 'ali@inflix.co.uk').trim();

// Every permission id used across the admin panel
// (kept in sync with adminpanel: roles/constants/permissionGroups.js)
const PERMISSION_IDS = [
  // Dashboard
  'view_dashboard', 'export_dashboard',
  // Blogs
  'view_blogs', 'manage_blogs',
  // Media
  'view_media', 'manage_media',
  // Products
  'view_products', 'manage_products',
  // Product Central
  'view_product_central', 'manage_product_central',
  // Coupons
  'view_coupons', 'manage_coupons',
  // Orders
  'view_orders', 'manage_orders',
  // Returns
  'view_returns', 'manage_returns',
  // Return Requests
  'view_return_requests', 'manage_return_requests',
  // Messages
  'view_messages', 'manage_messages',
  // Reviews
  'view_reviews', 'manage_reviews',
  // Users
  'view_users', 'manage_users',
  // Subscribers
  'view_subscribers', 'manage_subscribers',
  // Deals & Discounts
  'view_deals', 'manage_deals',
  // Roles & Permissions
  'view_roles', 'manage_roles',
  'view_permissions', 'manage_permissions',
  // Static Meta
  'view_static_meta', 'manage_static_meta',
];

// Namespaces the sidebar / PermissionRoute guards look under. We set the full
// permission map under each so any `p?.<namespace>?.<id>` check passes.
const NAMESPACES = [
  'store',
  'zextons',
  'rolesandPermissions',
  'rolesandpermissions',
  'staticMeta',
];

function buildAllPermissions() {
  const allTrue = {};
  for (const id of PERMISSION_IDS) allTrue[id] = true;

  const permissions = {};
  for (const ns of NAMESPACES) permissions[ns] = { ...allTrue };
  return permissions;
}

function resolveUri() {
  const raw = (process.env.MONGO_URI || process.env.DATABASE_URL || '').trim();
  return raw.replace(/^['"]|['"]$/g, '').replace(/^(MONGO_URI|DATABASE_URL)=/i, '').trim();
}

async function main() {
  const uri = resolveUri();
  if (!uri) {
    console.error('❌ Missing MONGO_URI / DATABASE_URL in environment.');
    process.exit(1);
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 45000,
    directConnection: true,
    family: 4,
  });
  console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);

  const user = await User.findOne({ email: new RegExp(`^${EMAIL}$`, 'i') });
  if (!user) {
    console.error(`❌ User not found: ${EMAIL}`);
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`👤 User: ${user.email} (_id=${user._id}) role="${user.role}" roleId=${user.roleId || 'none'}`);

  const permissions = buildAllPermissions();

  // Resolve the role to update: the user's existing role, else a shared
  // "Administrator" role (create if missing).
  let role = user.roleId ? await Role.findById(user.roleId) : null;
  if (!role) {
    role = await Role.findOne({ name: 'Administrator' });
    if (!role) {
      role = new Role({ name: 'Administrator', description: 'Full access — all permissions' });
      console.log('ℹ️  No role on user; creating a new "Administrator" role.');
    } else {
      console.log('ℹ️  No role on user; reusing existing "Administrator" role.');
    }
  }

  role.permissions = permissions;
  role.markModified('permissions'); // Mixed type — force change detection
  role.updatedAt = new Date();
  await role.save();
  console.log(`🔓 Role "${role.name}" (_id=${role._id}) now has ALL ${PERMISSION_IDS.length} permissions across ${NAMESPACES.length} namespaces.`);

  if (String(user.roleId || '') !== String(role._id)) {
    user.roleId = role._id;
    await user.save();
    console.log(`🔗 Assigned role ${role._id} to ${user.email}.`);
  }

  await mongoose.disconnect();
  console.log('✅ Done. Ask the user to log out and log back in to refresh their permissions.');
}

main().catch(async (err) => {
  console.error('❌ Error:', err);
  try { await mongoose.disconnect(); } catch (_) { /* ignore */ }
  process.exit(1);
});
