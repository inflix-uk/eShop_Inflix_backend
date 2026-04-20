const mongoose = require('mongoose');
const User = require('../src/models/user');
require('../src/models/roleAndPermissons');

(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    const email = process.argv[2] || 'admin@zextons.co.uk';
    const u = await User.findOne({ email }).populate('roleId');
    if (!u) { console.log('Not found:', email); process.exit(1); }
    console.log('email:      ', u.email);
    console.log('role:       ', u.role);
    console.log('roleId.name:', u.roleId && u.roleId.name);
    console.log('permissions:', JSON.stringify(u.roleId && u.roleId.permissions, null, 2));
    await mongoose.disconnect();
})();
