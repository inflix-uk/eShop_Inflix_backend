const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/user');

(async () => {
    const email = process.argv[2] || 'admin@zextons.co.uk';
    const newPassword = process.argv[3] || 'Admin@123456';

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('DB:', mongoose.connection.name);

    const user = await User.findOne({ email });
    if (!user) { console.error('Not found:', email); process.exit(1); }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    const verify = await User.findOne({ email });
    const ok = await bcrypt.compare(newPassword, verify.password);
    console.log('Password reset for', email, '| verify compare:', ok);
    console.log('New password:', newPassword);

    await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
