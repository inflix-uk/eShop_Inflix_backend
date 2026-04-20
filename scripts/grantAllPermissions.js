// Assigns ALL permissions (as defined in adminpanel permissionGroups.js) to a user's role.
// The admin panel checks permissions as permissions[section][permissionId] (see PermissionRoute.jsx:59).
// Permission IDs are the canonical list from eShop_Inflix_adminpanle/src/pages/adminpages/roles/constants/permissionGroups.js.

const mongoose = require('mongoose');
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
    'view_deals', 'manage_deals'
];

const ROLES_IDS = ['view_roles', 'manage_roles', 'view_permissions', 'manage_permissions'];
const STATIC_META_IDS = ['view_static_meta', 'manage_static_meta'];

const allTrue = (ids) => ids.reduce((acc, id) => (acc[id] = true, acc), {});

const FULL_PERMISSIONS = {
    zextons: allTrue(ZEXTONS_IDS),
    rolesandPermissions: allTrue(ROLES_IDS),
    staticMeta: allTrue(STATIC_META_IDS)
};

(async () => {
    const email = process.argv[2];
    if (!email) { console.error('usage: node grantAllPermissions.js <email>'); process.exit(1); }

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('DB:', mongoose.connection.name);

    const user = await User.findOne({ email });
    if (!user) { console.error('User not found:', email); process.exit(2); }

    // Find the role linked to this user; if none, create a dedicated 'administrator' role
    let role = user.roleId ? await RoleAndPermissons.findById(user.roleId) : null;
    if (!role) {
        role = await RoleAndPermissons.findOne({ name: /^administrator$/i })
            || await RoleAndPermissons.findOne({ name: 'admin' });
    }
    if (!role) {
        role = await RoleAndPermissons.create({
            name: 'administrator',
            description: 'Full access',
            permissions: FULL_PERMISSIONS
        });
        console.log('Created role:', role.name, role._id);
    }

    role.permissions = FULL_PERMISSIONS;
    role.markModified('permissions');
    await role.save();
    console.log('Role permissions overwritten:', role.name, role._id);

    user.role = 'admin';
    user.roleId = role._id;
    await user.save();

    // Verify via the same populate the login controller uses
    const verify = await User.findOne({ email }).populate('roleId');
    console.log('\n--- VERIFY ---');
    console.log('email:', verify.email, '| role:', verify.role);
    console.log('roleId.name:', verify.roleId.name);
    const p = verify.roleId.permissions || {};
    console.log('zextons keys:', Object.keys(p.zextons || {}).length, '/', ZEXTONS_IDS.length);
    console.log('rolesandPermissions keys:', Object.keys(p.rolesandPermissions || {}).length, '/', ROLES_IDS.length);
    console.log('staticMeta keys:', Object.keys(p.staticMeta || {}).length, '/', STATIC_META_IDS.length);
    console.log('sample (manage_products):', p.zextons?.manage_products);
    console.log('sample (manage_roles):  ', p.rolesandPermissions?.manage_roles);
    console.log('sample (manage_static_meta):', p.staticMeta?.manage_static_meta);

    await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
