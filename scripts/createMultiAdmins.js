// scripts/createMultiAdmins.js
// One-off: create admin users across multiple databases

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const userSchema = require('../src/models/user').schema;
const roleSchema = require('../src/models/roleAndPermissons').schema;

const TARGETS = [
    {
        uri: 'mongodb://admin_inflix_root:kqcFAj9aVV6GsjtOkPH9icOlqIkWw16e@153.92.211.241:32770/regenerateGlobalLimited?authSource=admin',
        email: 'admin@regenerategloballimited.com',
        password: 'Admin@123456',
        companyname: 'Regenerate Global Limited'
    },
    {
        uri: 'mongodb://admin_inflix_root:kqcFAj9aVV6GsjtOkPH9icOlqIkWw16e@153.92.211.241:32770/pearlzzFashion?authSource=admin',
        email: 'admin@pearlzz.com',
        password: 'Admin@123456',
        companyname: 'Pearlzz Fashion'
    },
    {
        uri: 'mongodb://admin_inflix_root:kqcFAj9aVV6GsjtOkPH9icOlqIkWw16e@153.92.211.241:32770/spectro?authSource=admin',
        email: 'admin@spectro.com',
        password: 'Admin@123456',
        companyname: 'Spectro'
    }
];

async function ensureAdmin(target) {
    console.log(`\n──────────────────────────────────────────────────`);
    console.log(`🔄 Connecting: ${target.uri.split('@')[1].split('?')[0]}`);

    const conn = await mongoose.createConnection(target.uri, {
        serverSelectionTimeoutMS: 15000
    }).asPromise();

    console.log(`✅ Connected to DB: ${conn.name}`);

    const User = conn.model('User', userSchema);
    const RoleAndPermissons = conn.model('RoleAndPermissons', roleSchema);

    try {
        let adminRole = await RoleAndPermissons.findOne({ name: 'admin' });
        if (!adminRole) {
            console.log('📝 Creating admin role...');
            adminRole = await RoleAndPermissons.create({
                name: 'admin',
                description: 'Administrator role with full permissions',
                permissions: {
                    users: { create: true, read: true, update: true, delete: true },
                    products: { create: true, read: true, update: true, delete: true },
                    orders: { create: true, read: true, update: true, delete: true },
                    banners: { create: true, read: true, update: true, delete: true },
                    blogs: { create: true, read: true, update: true, delete: true },
                    settings: { create: true, read: true, update: true, delete: true }
                }
            });
            console.log('✅ Admin role created');
        } else {
            console.log('✅ Admin role found');
        }

        const hashedPassword = await bcrypt.hash(target.password, 10);
        const existing = await User.findOne({ email: target.email });

        if (existing) {
            console.log(`⚠️  User exists: ${target.email} — updating to admin`);
            existing.role = 'admin';
            existing.roleId = adminRole._id;
            existing.password = hashedPassword;
            existing.companyname = existing.companyname || target.companyname;
            await existing.save();
            console.log(`✅ Updated. ID: ${existing._id}`);
        } else {
            const adminUser = await User.create({
                firstname: 'Admin',
                lastname: 'User',
                email: target.email,
                password: hashedPassword,
                phoneNumber: '+441234567890',
                companyname: target.companyname,
                role: 'admin',
                roleId: adminRole._id
            });
            console.log(`✅ Created admin. ID: ${adminUser._id}`);
        }

        console.log(`   Email: ${target.email}`);
        console.log(`   Password: ${target.password}`);
    } catch (err) {
        console.error(`❌ Error for ${target.email}:`, err.message);
    } finally {
        await conn.close();
        console.log('🔌 Disconnected');
    }
}

(async () => {
    for (const t of TARGETS) {
        await ensureAdmin(t);
    }
    console.log('\n✅ All done.');
    process.exit(0);
})();
