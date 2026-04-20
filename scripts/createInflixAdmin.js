const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/user');
const RoleAndPermissons = require('../src/models/roleAndPermissons');

(async () => {
    const email = process.argv[2];
    const password = process.argv[3];
    if (!email || !password) { console.error('usage: node createInflixAdmin.js <email> <password>'); process.exit(1); }

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('DB:', mongoose.connection.name);

    const adminRole = await RoleAndPermissons.findOne({ name: 'admin' });
    if (!adminRole) { console.error('admin role missing — run fixAdminInflix.js first'); process.exit(2); }
    console.log('admin role:', adminRole._id);

    const hash = await bcrypt.hash(password, 10);

    let user = await User.findOne({ email });
    if (user) {
        user.role = 'admin';
        user.roleId = adminRole._id;
        user.password = hash;
        await user.save();
        console.log('Updated existing user:', email);
    } else {
        user = await User.create({
            firstname: 'Ali',
            lastname: 'Admin',
            email,
            password: hash,
            role: 'admin',
            roleId: adminRole._id,
            companyname: 'Inflix'
        });
        console.log('Created new admin:', email, '| _id:', user._id);
    }

    const verify = await User.findOne({ email }).populate('roleId');
    const ok = await bcrypt.compare(password, verify.password);
    console.log('password verify:', ok);
    console.log('role:', verify.role, '| roleId.name:', verify.roleId && verify.roleId.name);
    console.log('permissions keys:', verify.roleId && Object.keys(verify.roleId.permissions || {}));

    await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
