// scripts/resetUserPassword.js
// Run: node scripts/resetUserPassword.js

const mongoose = require('../connections/mongo');
const User = require('../src/models/user');
const bcrypt = require('bcrypt');

const USER_EMAIL = 'ali@zextons.co.uk';
const NEW_PASSWORD = 'Admin@123';

async function resetPassword() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connection;
        console.log('Connected to MongoDB\n');

        // Find the user
        const user = await User.findOne({ email: USER_EMAIL });

        if (!user) {
            console.log(`User not found: ${USER_EMAIL}`);
            process.exit(1);
        }

        console.log(`Found user: ${user.firstname} ${user.lastname}`);

        // Hash the new password
        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

        // Update password
        user.password = hashedPassword;
        await user.save();

        console.log(`\nPassword reset successful!`);
        console.log(`Email: ${USER_EMAIL}`);
        console.log(`New Password: ${NEW_PASSWORD}`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

resetPassword();
