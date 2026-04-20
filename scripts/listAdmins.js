const mongoose = require('mongoose');
const User = require('../src/models/user');

(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('DB:', mongoose.connection.name);

    const total = await User.countDocuments();
    console.log('Total users:', total);

    const admins = await User.find({ role: 'admin' }).select('email role roleId createdAt').lean();
    console.log('\nUsers with role=admin:', admins.length);
    admins.forEach(a => console.log(' ', a.email, '| roleId:', a.roleId, '| created:', a.createdAt));

    const inflix = await User.find({ email: /inflix/i }).select('email role roleId firstname lastname createdAt').lean();
    console.log('\nUsers with "inflix" in email:', inflix.length);
    inflix.forEach(a => console.log(' ', a.email, '| role:', a.role, '| roleId:', a.roleId));

    const recent = await User.find().sort({ createdAt: -1 }).limit(10).select('email role createdAt').lean();
    console.log('\n10 most recent users:');
    recent.forEach(a => console.log(' ', a.email, '| role:', a.role, '| created:', a.createdAt));

    await mongoose.disconnect();
})();
