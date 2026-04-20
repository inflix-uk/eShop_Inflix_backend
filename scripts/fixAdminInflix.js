// scripts/fixAdminInflix.js
// Diagnose + repair full permissions for admin@inflix.uk

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/user');
const RoleAndPermissons = require('../src/models/roleAndPermissons');

const ADMIN_EMAIL = 'admin@inflix.uk';

const FULL_PERMISSIONS = {
    users:    { create: true, read: true, update: true, delete: true },
    products: { create: true, read: true, update: true, delete: true },
    orders:   { create: true, read: true, update: true, delete: true },
    banners:  { create: true, read: true, update: true, delete: true },
    blogs:    { create: true, read: true, update: true, delete: true },
    settings: { create: true, read: true, update: true, delete: true },
    roles:    { create: true, read: true, update: true, delete: true },
    categories: { create: true, read: true, update: true, delete: true },
    coupons:  { create: true, read: true, update: true, delete: true },
    reviews:  { create: true, read: true, update: true, delete: true }
};

(async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) { console.error('MONGO_URI missing'); process.exit(1); }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('Connected to:', mongoose.connection.name);

    // 1. Ensure 'admin' role exists WITH full permissions (overwrite — existing role may have {} perms from a buggy earlier run)
    let adminRole = await RoleAndPermissons.findOne({ name: 'admin' });
    if (!adminRole) {
        adminRole = await RoleAndPermissons.create({
            name: 'admin',
            description: 'Administrator role with full permissions',
            permissions: FULL_PERMISSIONS
        });
        console.log('Created admin role:', adminRole._id);
    } else {
        console.log('Existing admin role:', adminRole._id);
        console.log('  current permissions:', JSON.stringify(adminRole.permissions));
        adminRole.permissions = FULL_PERMISSIONS;
        adminRole.markModified('permissions');
        await adminRole.save();
        console.log('  -> overwrote with full permissions');
    }

    // 2. Link admin@inflix.uk to this role
    const user = await User.findOne({ email: ADMIN_EMAIL });
    if (!user) {
        console.error('User', ADMIN_EMAIL, 'not found. Aborting.');
        process.exit(2);
    }
    console.log('Found user:', user._id, '| role:', user.role, '| roleId:', user.roleId);

    user.role = 'admin';
    user.roleId = adminRole._id;
    await user.save();

    // 3. Verify by replaying the login populate
    const verify = await User.findOne({ email: ADMIN_EMAIL }).populate('roleId');
    console.log('\n--- VERIFICATION ---');
    console.log('email:      ', verify.email);
    console.log('role:       ', verify.role);
    console.log('roleId._id: ', verify.roleId && verify.roleId._id);
    console.log('roleId.name:', verify.roleId && verify.roleId.name);
    console.log('permissions:', JSON.stringify(verify.roleId && verify.roleId.permissions, null, 2));

    await mongoose.disconnect();
    process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
