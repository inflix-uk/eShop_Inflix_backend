// Reusable admin seeder. Re-runnable on any DB.
//
// Usage:
//   MONGO_URI="mongodb://..." node scripts/seedAdminFull.js <email> <password> [roleName]
//   # or pass URI inline:
//   node scripts/seedAdminFull.js <email> <password> [roleName] --uri "mongodb://..."
//
// Falls back to .env MONGO_URI if no --uri / env var supplied.
//
// Writes the FULL permission shape consumed by the admin panel UI:
//   permissions.zextons.*               (Side.jsx, utils/permissions.js)
//   permissions.rolesandPermissions.*   (capital P — same consumers)
//   permissions.rolesandpermissions.*   (lowercase — PermissionsManagement.jsx)
//   permissions.staticMeta.*

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/user');
const RoleAndPermissons = require('../src/models/roleAndPermissons');

const ZEXTONS_IDS = [
    'view_dashboard', 'export_dashboard',
    'view_blogs', 'manage_blogs',
    'view_media', 'manage_media',
    'view_products', 'manage_products',
    'view_product_central', 'manage_product_central',
    'view_coupons', 'manage_coupons',
    'view_orders', 'manage_orders',
    'view_returns', 'manage_returns',
    'view_return_requests', 'manage_return_requests',
    'view_messages', 'manage_messages',
    'view_reviews', 'manage_reviews',
    'view_users', 'manage_users',
    'view_subscribers', 'manage_subscribers',
    'view_deals', 'manage_deals',
    'view_banners', 'manage_banners'
];
const ROLES_IDS = ['view_roles', 'manage_roles', 'view_permissions', 'manage_permissions'];
const STATIC_META_IDS = ['view_static_meta', 'manage_static_meta'];

const allTrue = (ids) => ids.reduce((acc, id) => (acc[id] = true, acc), {});

const FULL_PERMISSIONS = {
    zextons: allTrue(ZEXTONS_IDS),
    rolesandPermissions: allTrue(ROLES_IDS),
    rolesandpermissions: allTrue(ROLES_IDS),
    staticMeta: allTrue(STATIC_META_IDS)
};

function parseArgs(argv) {
    const out = { positional: [], uri: null };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--uri') { out.uri = argv[i + 1]; i++; }
        else out.positional.push(argv[i]);
    }
    return out;
}

(async () => {
    const { positional, uri: cliUri } = parseArgs(process.argv.slice(2));
    const [email, password, roleName = 'admin'] = positional;

    if (!email || !password) {
        console.error('usage: node scripts/seedAdminFull.js <email> <password> [roleName] [--uri <mongodb-uri>]');
        process.exit(1);
    }

    const uri = cliUri || process.env.MONGO_URI;
    if (!uri) {
        console.error('No MongoDB URI. Pass --uri "mongodb://..." or set MONGO_URI.');
        process.exit(1);
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
    console.log('Connected DB:', mongoose.connection.name);

    let role = await RoleAndPermissons.findOne({ name: roleName });
    if (!role) {
        role = await RoleAndPermissons.create({
            name: roleName,
            description: 'Full access (seeded)',
            permissions: FULL_PERMISSIONS
        });
        console.log('Created role:', role.name, role._id);
    } else {
        role.permissions = FULL_PERMISSIONS;
        role.markModified('permissions');
        role.updatedAt = new Date();
        await role.save();
        console.log('Updated role:', role.name, role._id);
    }

    const hash = await bcrypt.hash(password, 10);
    let user = await User.findOne({ email });
    if (user) {
        user.password = hash;
        user.role = 'admin';
        user.roleId = role._id;
        await user.save();
        console.log('Updated user:', email, user._id);
    } else {
        user = await User.create({
            firstname: 'Admin',
            lastname: 'User',
            email,
            password: hash,
            role: 'admin',
            roleId: role._id
        });
        console.log('Created user:', email, user._id);
    }

    const verify = await User.findOne({ email }).populate('roleId');
    const pwOk = await bcrypt.compare(password, verify.password);
    const p = (verify.roleId && verify.roleId.permissions) || {};
    console.log('\n--- VERIFY ---');
    console.log('email:', verify.email, '| role:', verify.role);
    console.log('roleId.name:', verify.roleId && verify.roleId.name);
    console.log('password verify:', pwOk);
    console.log('zextons keys:', Object.keys(p.zextons || {}).length, '/', ZEXTONS_IDS.length);
    console.log('rolesandPermissions keys:', Object.keys(p.rolesandPermissions || {}).length, '/', ROLES_IDS.length);
    console.log('rolesandpermissions keys:', Object.keys(p.rolesandpermissions || {}).length, '/', ROLES_IDS.length);
    console.log('staticMeta keys:', Object.keys(p.staticMeta || {}).length, '/', STATIC_META_IDS.length);

    await mongoose.disconnect();
    process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
