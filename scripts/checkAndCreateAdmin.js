// scripts/checkAndCreateAdmin.js
// Quick script to check if admin exists and create if not

const mongoose = require('../connections/mongo');
const User = require('../models/user');
const RoleAndPermissons = require('../models/roleAndPermissons');
const bcrypt = require('bcrypt');

const ADMIN_EMAIL = 'admin@zextons.co.uk';
const ADMIN_PASSWORD = 'Admin@123456';

async function checkAndCreateAdmin() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connection;
        console.log('✅ Connected to MongoDB\n');

        // Check if user exists
        let user = await User.findOne({ email: ADMIN_EMAIL });
        
        if (user) {
            console.log('✅ User found:', ADMIN_EMAIL);
            console.log('   User ID:', user._id);
            console.log('   Current Role:', user.role);
            
            // Update to admin if not already
            if (user.role !== 'admin') {
                console.log('🔄 Updating role to admin...');
                user.role = 'admin';
                
                // Get or create admin role
                let adminRole = await RoleAndPermissons.findOne({ name: 'admin' });
                if (!adminRole) {
                    adminRole = new RoleAndPermissons({
                        name: 'admin',
                        description: 'Administrator role',
                        permissions: {}
                    });
                    await adminRole.save();
                }
                user.roleId = adminRole._id;
                
                // Update password
                user.password = await bcrypt.hash(ADMIN_PASSWORD, 10);
                await user.save();
                console.log('✅ User updated to admin!');
            } else {
                console.log('✅ User is already an admin');
                // Update password anyway to ensure it's correct
                user.password = await bcrypt.hash(ADMIN_PASSWORD, 10);
                await user.save();
                console.log('✅ Password updated');
            }
        } else {
            console.log('❌ User not found. Creating admin user...');
            
            // Get or create admin role
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
                console.log('✅ Admin role created');
            }
            
            // Create admin user
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
            user = new User({
                firstname: 'Admin',
                lastname: 'User',
                email: ADMIN_EMAIL,
                password: hashedPassword,
                role: 'admin',
                roleId: adminRole._id,
                companyname: 'Zextons'
            });
            
            await user.save();
            console.log('✅ Admin user created successfully!');
        }
        
        console.log('\n╔════════════════════════════════════════════════════╗');
        console.log('║              ADMIN LOGIN CREDENTIALS                 ║');
        console.log('╠════════════════════════════════════════════════════╣');
        console.log(`║  Email: ${ADMIN_EMAIL.padEnd(46)}║`);
        console.log(`║  Password: ${ADMIN_PASSWORD.padEnd(42)}║`);
        console.log(`║  Role: admin`.padEnd(54) + '║');
        console.log('╚════════════════════════════════════════════════════╝');
        console.log('\n✅ You can now login with these credentials!\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 11000) {
            console.error('   Email already exists');
        }
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkAndCreateAdmin();
