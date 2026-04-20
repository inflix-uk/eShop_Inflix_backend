/**
 * Change User Password Script
 * Run: node src/seeders/changePassword.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://zextonsAdmin:12345@zextons.y1to4og.mongodb.net/zextonsnew';

// User schema
const userSchema = new mongoose.Schema({
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    dateofbirth: { type: Date, default: null },
    password: { type: String, required: true },
    phoneNumber: { type: String, default: null },
    address: { type: Object, default: null },
    sellerType: { type: String, default: null },
    address2: { type: String, default: null },
    payableAccount: [],
    companyname: { type: String, default: null },
    role: { type: String, default: "user" },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoleAndPermissons', default: null },
    registerForApp: { type: Boolean, default: false },
    otp: String,
    otpExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function changePassword() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const userEmail = 'ali@zextons.co.uk';
        const newPassword = 'admin123';

        // Find user
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            console.log('User not found:', userEmail);
            process.exit(1);
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        user.password = hashedPassword;
        await user.save();

        console.log('Password changed successfully!');
        console.log('Email:', userEmail);
        console.log('New Password:', newPassword);

        process.exit(0);
    } catch (error) {
        console.error('Error changing password:', error.message);
        process.exit(1);
    }
}

changePassword();
