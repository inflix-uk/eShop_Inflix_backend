// One-off: grant ALL permissions to admin@regenerategloballimited.com on the regenerateGlobalLimited DB.
// Sets both `rolesandPermissions` (capital P — used by Side.jsx + utils/permissions.js)
// AND `rolesandpermissions` (lowercase — used by PermissionsManagement.jsx UI section key).

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/user');
const RoleAndPermissons = require('../src/models/roleAndPermissons');

const MONGO_URI = 'mongodb://admin_inflix_root:kqcFAj9aVV6GsjtOkPH9icOlqIkWw16e@153.92.211.241:32770/regenerateGlobalLimited?authSource=admin';
const TARGET_EMAIL = 'admin@regenerategloballimited.com';
const TARGET_PASSWORD = 'Admin@123456';

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

(async () => {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
    console.log('Connected DB:', mongoose.connection.name);

    let user = await User.findOne({ email: TARGET_EMAIL });
    if (!user) {
        const hashed = await bcrypt.hash(TARGET_PASSWORD, 10);
        user = await User.create({
            firstname: 'Admin',
            lastname: 'Regenerate',
            email: TARGET_EMAIL,
            password: hashed,
            role: 'admin'
        });
        console.log('Created user:', user.email, user._id);
    } else {
        console.log('Found user:', user.email, user._id);
    }

    let role = user.roleId ? await RoleAndPermissons.findById(user.roleId) : null;
    if (!role) {
        role = await RoleAndPermissons.findOne({ name: /^administrator$/i })
            || await RoleAndPermissons.findOne({ name: /^admin$/i });
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
    console.log('Role permissions overwritten on:', role.name, role._id);

    user.role = 'admin';
    user.roleId = role._id;
    await user.save();
    console.log('User linked to role.');

    const verify = await User.findOne({ email: TARGET_EMAIL }).populate('roleId');
    console.log('\n--- VERIFY ---');
    console.log('email:', verify.email, '| role:', verify.role);
    console.log('roleId.name:', verify.roleId && verify.roleId.name);
    const p = (verify.roleId && verify.roleId.permissions) || {};
    console.log('zextons keys:', Object.keys(p.zextons || {}).length, '/', ZEXTONS_IDS.length);
    console.log('rolesandPermissions keys:', Object.keys(p.rolesandPermissions || {}).length, '/', ROLES_IDS.length);
    console.log('rolesandpermissions keys:', Object.keys(p.rolesandpermissions || {}).length, '/', ROLES_IDS.length);
    console.log('staticMeta keys:', Object.keys(p.staticMeta || {}).length, '/', STATIC_META_IDS.length);
    console.log('sample manage_products:', p.zextons && p.zextons.manage_products);
    console.log('sample manage_roles:    ', p.rolesandPermissions && p.rolesandPermissions.manage_roles);
    console.log('sample manage_static_meta:', p.staticMeta && p.staticMeta.manage_static_meta);

    await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
