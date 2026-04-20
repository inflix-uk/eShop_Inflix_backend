// Bootstrap a fresh DB: create 'admin' role with full permissions + create admin user.
// Permission shape matches eShop_Inflix_adminpanle/src/pages/adminpages/roles/constants/permissionGroups.js
// and the frontend check in src/context/PermissionRoute.jsx:59 → permissions[section][id].

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
    'view_deals', 'manage_deals'
];
const ROLES_IDS = ['view_roles', 'manage_roles', 'view_permissions', 'manage_permissions'];
const STATIC_META_IDS = ['view_static_meta', 'manage_static_meta'];
const allTrue = (ids) => ids.reduce((a, id) => (a[id] = true, a), {});

const FULL_PERMISSIONS = {
    zextons: allTrue(ZEXTONS_IDS),
    rolesandPermissions: allTrue(ROLES_IDS),
    staticMeta: allTrue(STATIC_META_IDS)
};

(async () => {
    const email = process.argv[2];
    const password = process.argv[3];
    const firstname = process.argv[4] || 'Admin';
    const lastname = process.argv[5] || 'User';
    if (!email || !password) {
        console.error('usage: node seedAdmin.js <email> <password> [firstname] [lastname]');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('DB:', mongoose.connection.name);

    let role = await RoleAndPermissons.findOne({ name: 'admin' });
    if (!role) {
        role = await RoleAndPermissons.create({
            name: 'admin',
            description: 'Administrator with full permissions',
            permissions: FULL_PERMISSIONS
        });
        console.log('Created admin role:', role._id);
    } else {
        role.permissions = FULL_PERMISSIONS;
        role.markModified('permissions');
        await role.save();
        console.log('Updated existing admin role:', role._id);
    }

    const hash = await bcrypt.hash(password, 10);

    let user = await User.findOne({ email });
    if (user) {
        user.role = 'admin';
        user.roleId = role._id;
        user.password = hash;
        await user.save();
        console.log('Updated existing user:', email);
    } else {
        user = await User.create({
            firstname, lastname, email,
            password: hash,
            role: 'admin',
            roleId: role._id,
            companyname: 'Pearlzz'
        });
        console.log('Created admin user:', email, '| _id:', user._id);
    }

    const verify = await User.findOne({ email }).populate('roleId');
    const pwOk = await bcrypt.compare(password, verify.password);
    const p = verify.roleId.permissions || {};
    console.log('\n--- VERIFY ---');
    console.log('email:', verify.email, '| role:', verify.role, '| roleId.name:', verify.roleId.name);
    console.log('password verify:', pwOk);
    console.log('zextons / rolesandPermissions / staticMeta keys:',
        Object.keys(p.zextons || {}).length, '/',
        Object.keys(p.rolesandPermissions || {}).length, '/',
        Object.keys(p.staticMeta || {}).length);

    await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
