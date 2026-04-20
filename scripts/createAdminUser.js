// scripts/createAdminUser.js
// Script to create an admin user in the database

const mongoose = require('../connections/mongo');
const User = require('../models/user');
const RoleAndPermissons = require('../models/roleAndPermissons');
const bcrypt = require('bcrypt');
const readline = require('readline');
require('dotenv').config();

// Admin user configuration
const ADMIN_CONFIG = {
    firstname: 'Admin',
    lastname: 'User',
    email: 'admin@zextons.co.uk', // Change this to your desired admin email
    password: 'Admin@123456', // Change this to your desired password
    phoneNumber: '+441234567890', // Optional
    role: 'admin',
    companyname: 'Zextons'
};

async function createAdminUser() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        
        // Wait for MongoDB connection
        await mongoose.connection;
        console.log('✅ Connected to MongoDB\n');

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: ADMIN_CONFIG.email });
        if (existingAdmin) {
            console.log('⚠️  Admin user already exists with email:', ADMIN_CONFIG.email);
            console.log('   User ID:', existingAdmin._id);
            console.log('   Role:', existingAdmin.role);
            
            // Update existing user to admin automatically
            console.log('\n🔄 Updating existing user to admin...');
            existingAdmin.role = 'admin';
            if (ADMIN_CONFIG.password) {
                existingAdmin.password = await bcrypt.hash(ADMIN_CONFIG.password, 10);
                console.log('   Password updated');
            }
            await existingAdmin.save();
            console.log('✅ Existing user updated to admin successfully!');
            console.log('╔════════════════════════════════════════════════════╗');
            console.log('║              ADMIN USER DETAILS                    ║');
            console.log('╠════════════════════════════════════════════════════╣');
            console.log(`║  Name: ${(existingAdmin.firstname + ' ' + existingAdmin.lastname).padEnd(47)}║`);
            console.log(`║  Email: ${existingAdmin.email.padEnd(46)}║`);
            console.log(`║  Password: ${ADMIN_CONFIG.password.padEnd(42)}║`);
            console.log(`║  Role: admin`.padEnd(54) + '║');
            console.log(`║  User ID: ${existingAdmin._id.toString().padEnd(43)}║`);
            console.log('╚════════════════════════════════════════════════════╝');
            await mongoose.disconnect();
            process.exit(0);
        }

        // Check if admin role exists, if not create it
        let adminRole = await RoleAndPermissons.findOne({ name: 'admin' });
        if (!adminRole) {
            console.log('📝 Creating admin role...');
            adminRole = new RoleAndPermissons({
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
            await adminRole.save();
            console.log('✅ Admin role created\n');
        } else {
            console.log('✅ Admin role found\n');
        }

        // Hash the password
        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(ADMIN_CONFIG.password, 10);

        // Create the admin user
        console.log('👤 Creating admin user...');
        const adminUser = new User({
            firstname: ADMIN_CONFIG.firstname,
            lastname: ADMIN_CONFIG.lastname,
            email: ADMIN_CONFIG.email,
            password: hashedPassword,
            phoneNumber: ADMIN_CONFIG.phoneNumber,
            companyname: ADMIN_CONFIG.companyname,
            role: ADMIN_CONFIG.role,
            roleId: adminRole._id
        });

        await adminUser.save();

        console.log('\n✅ Admin user created successfully!');
        console.log('╔════════════════════════════════════════════════════╗');
        console.log('║              ADMIN USER DETAILS                    ║');
        console.log('╠════════════════════════════════════════════════════╣');
        console.log(`║  Name: ${(ADMIN_CONFIG.firstname + ' ' + ADMIN_CONFIG.lastname).padEnd(47)}║`);
        console.log(`║  Email: ${ADMIN_CONFIG.email.padEnd(46)}║`);
        console.log(`║  Password: ${ADMIN_CONFIG.password.padEnd(42)}║`);
        console.log(`║  Role: ${ADMIN_CONFIG.role.padEnd(48)}║`);
        console.log(`║  User ID: ${adminUser._id.toString().padEnd(43)}║`);
        console.log('╚════════════════════════════════════════════════════╝');
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');
        console.log('⚠️  IMPORTANT: Keep these credentials secure!\n');

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        if (error.code === 11000) {
            console.error('   Email already exists in database');
        }
    } finally {
        // Close MongoDB connection
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the script
if (require.main === module) {
    createAdminUser();
}

module.exports = createAdminUser;
