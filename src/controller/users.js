// controller/users.js
const User = require("../models/user");
const bcrypt = require("bcrypt");
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');
const { toSafeUser, SENSITIVE_USER_FIELDS } = require('../utils/safeUser');
const { sendLoginSuccess, clearAuthCookie } = require('../utils/authCookies');
const { sendInvalidCredentials } = require('../utils/loginResponses');
const { sendRegistrationRejected } = require('../utils/registrationResponses');

const usersController = {
    registerUser: async (req, res, next) => {
        try {
            const { firstName, lastName, email, password, phoneNumber, companyname, address ,dateofbirth,payableAccount,address2 } = req.body;

            const existingEmail = await User.findOne({ email });
            if (existingEmail) {
                return sendRegistrationRejected(res);
            }

            if (phoneNumber) {
                const existingPhoneNumber = await User.findOne({ phoneNumber });
                if (existingPhoneNumber) {
                    return sendRegistrationRejected(res);
                }
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = new User({
                firstname: firstName,
                lastname: lastName,
                email,
                password: hashedPassword,
                phoneNumber,
                companyname,
                dateofbirth,
                address2,
                payableAccount,
                address: address ? {
                    address: address.address,
                    apartment: address.apartment,
                    country: address.country,
                    city: address.city,
                    county: address.county,
                    postalCode: address.postalCode
                } : undefined
            });

            await newUser.save();

            const sendWelcomeEmail = async () => {
                const emailContent = `
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Welcome to our store</title>
                        </head>
                        <body style="font-family: Arial, sans-serif;">
                        <div style="background-color: #f2f2f2; padding: 20px;">
                            <h1 style="color: #333333;">Welcome to our store!</h1>
                            <p style="color: #666666;">Dear ${firstName} ${lastName},</p>
                            <p style="color: #666666;">Thank you for registering with us. We're excited to have you on board and look forward to providing you with the best services.</p>
                            <p style="color: #666666;">If you have any questions or need any assistance, feel free to contact us.</p>
                            <p style="color: #666666;">Best regards,</p>
                            <p style="color: #666666;">The our store Team</p>
                        </div>
                        </body>
                        </html>
                    `;

                return sendMail({
                    to: newUser.email,
                    subject: 'Welcome to our store!',
                    html: emailContent
                });
            };

            sendWelcomeEmail().catch((emailError) => {
                console.error("Failed to send welcome email:", emailError);
            });

            return res.status(201).json({
                success: true,
                message: "User registered successfully",
                status: 201,
                user: toSafeUser(newUser)
            });
        } catch (error) {
            if (error && error.code === 11000) {
                return sendRegistrationRejected(res);
            }
            console.error("Error registering user:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    },

    registerUserFromAdmin: async (req, res, next) => {
        try {
            const { firstName, lastName, email, password, phoneNumber, companyname, address } = req.body;

            let userExist = await User.findOne({ email }).select(SENSITIVE_USER_FIELDS);
            if (userExist) {
                return res.json({ message: "User already exists", status: 409, user: toSafeUser(userExist) });
            }

            let userExistbyPhone = await User.findOne({ phoneNumber }).select(SENSITIVE_USER_FIELDS);
            if (userExistbyPhone) {
                return res.json({ message: "Phone number already exists", status: 409, user: toSafeUser(userExistbyPhone) });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = new User({
                firstname: firstName,
                lastname: lastName,
                email,
                password: hashedPassword,
                phoneNumber,
                companyname,
                address: address ? {
                    address: address.address,
                    apartment: address.apartment,
                    country: address.country,
                    city: address.city,
                    county: address.county,
                    postalCode: address.postalCode
                } : undefined
            });

            await newUser.save();

            const emailContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to our store</title>
                </head>
                <body style="font-family: Arial, sans-serif;">
                <div style="background-color: #f2f2f2; padding: 20px;">
                    <h1 style="color: #333333;">Welcome to our store!</h1>
                    <p style="color: #666666;">Dear ${firstName} ${lastName},</p>
                    <p style="color: #666666;">Your email address is: ${email}</p>
                    <p style="color: #666666;">Thank you for registering with us.</p>
                    <p style="color: #666666;">Best regards,</p>
                    <p style="color: #666666;">The our store Team</p>
                </div>
                </body>
                </html>
            `;

            sendMail({
                to: newUser.email,
                subject: 'Welcome to our store!',
                html: emailContent
            }).catch((err) => console.log("Error sending welcome email:", err));

            res.json({
                success: true,
                message: "User registered successfully",
                status: 201,
                user: toSafeUser(newUser)
            });
        } catch (error) {
            console.error("Error registering user:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    updateUser: async (req, res, next) => {
        try {
            const { id } = req.params;

            const {
                firstname,
                lastname,
                email,
                phoneNumber,
                companyname,
                dateofbirth,
                address,
            } = req.body;

            let user = await User.findById(id);

            if (!user) {
                return res.status(404).json({ message: "User not found", status: 404 });
            }

            const requesterId = req.user ? String(req.user.id || req.user._id) : null;
            const isSelf = requesterId && String(user._id) === requesterId;
            const isAdmin = req.user && ['admin', 'superadmin'].includes(String(req.user.role).toLowerCase());

            if (!isSelf && !isAdmin) {
                return res.status(403).json({ message: 'Forbidden', status: 403 });
            }

            if (firstname !== undefined) user.firstname = firstname;
            if (lastname !== undefined) user.lastname = lastname;
            if (email !== undefined) user.email = email;
            if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
            if (companyname !== undefined) user.companyname = companyname;
            if (dateofbirth !== undefined) user.dateofbirth = dateofbirth;

            if (isAdmin) {
                const { role, roleId } = req.body;
                if (role !== undefined) user.role = role;
                if (roleId !== undefined) user.roleId = roleId;
            }

            if (address && typeof address === 'object') {
                user.address = user.address || {};
                user.address.address = address.address !== undefined ? address.address : user.address.address;
                user.address.apartment = address.apartment !== undefined ? address.apartment : user.address.apartment;
                user.address.country = address.country !== undefined ? address.country : user.address.country;
                user.address.city = address.city !== undefined ? address.city : user.address.city;
                user.address.county = address.county !== undefined ? address.county : user.address.county;
                user.address.postalCode = address.postalCode !== undefined ? address.postalCode : user.address.postalCode;
            }

            await user.save();

            const populated = await User.findById(user._id)
                .select(SENSITIVE_USER_FIELDS)
                .populate('roleId');

            res.json({
                success: true,
                message: "User updated successfully",
                status: 201,
                user: toSafeUser(populated)
            });
        } catch (error) {
            console.error("Error updating user:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    loginUser: async (req, res, next) => {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email }).populate('roleId');

            if (!user) {
                return sendInvalidCredentials(res);
            }

            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                return sendInvalidCredentials(res);
            }

            return sendLoginSuccess(res, user, 'Login successful');
        } catch (error) {
            console.error("Error logging in user:", error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    superadminLogin: async (req, res, next) => {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email }).populate('roleId');
            if (!user) {
                return sendInvalidCredentials(res);
            }

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return sendInvalidCredentials(res);
            }

            if (user.role !== "superadmin") {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: superadmin only',
                });
            }

            return sendLoginSuccess(res, user, 'Superadmin login successful');
        } catch (error) {
            console.error("Error logging in superadmin:", error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    logoutUser: async (req, res, next) => {
        try {
            clearAuthCookie(res);
            return res.json({
                success: true,
                message: "Logout successful",
                status: 201
            });
        } catch (error) {
            console.error("Error logging out user:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    forgotPassword: async (req, res) => {
        const forgotPasswordAck = {
            success: true,
            message: 'If an account exists for this email, a reset link has been sent.',
            status: 201,
        };

        try {
            const { email } = req.body;
            const user = await User.findOne({ email });

            if (user) {
                const token = crypto.randomBytes(20).toString('hex');
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + (1 * 3600000);
                await user.save();

                const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
                const resetUrl = frontendUrl
                    ? `${frontendUrl}/resetpassword/${token}`
                    : `/resetpassword/${token}`;

                const emailContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
            </head>
            <body style="font-family: Arial, sans-serif;">
            <div style="background-color: #f2f2f2; padding: 20px;">
                <h1 style="color: #333333;">Password Reset</h1>
                <p style="color: #666666;">Dear User,</p>
                <p style="color: #666666;">You have requested to reset your password. To proceed with the password reset, please click on the button below:</p>
                <div style="text-align: center; margin-top: 20px;">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                </div>
                <p style="color: #666666;">This link will expire in 60 minutes.</p>
            </div>
            </body>
            </html>
            `;

                try {
                    await sendMail({
                        to: user.email,
                        subject: 'Reset Password',
                        html: emailContent,
                    });
                } catch (emailErr) {
                    console.error('Error sending reset password email:', emailErr);
                }
            }

            return res.status(200).json(forgotPasswordAck);
        } catch (error) {
            console.error("Error in forgotPassword:", error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    resetPassword: async (req, res) => {
        try {
            const { token, newPassword } = req.body;
            const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });

            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired token',
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            return res.status(200).json({
                success: true,
                message: 'Password reset successful',
                status: 201,
            });
        } catch (error) {
            console.error("Error in resetPassword:", error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    changepassword: async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body;
            const { id } = req.params;

            if (!req.user || String(req.user.id) !== String(id)) {
                return res.status(403).json({ message: 'Forbidden', status: 403 });
            }

            const user = await User.findById(id);

            if (!user) {
                return res.json({ message: 'User not found', status: 404 });
            }

            const isMatch = await bcrypt.compare(oldPassword, user.password);

            if (!isMatch) {
                return res.json({ message: 'Invalid old password', status: 400 });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            await user.save();

            return res.json({ message: 'Password changed successfully', status: 201 });
        } catch (error) {
            console.error("Error in changepassword:", error);
            return res.json({ message: 'Internal server error', status: 500 });
        }
    },

    getSessionUser: async (req, res) => {
        try {
            const user = await User.findById(req.user.id)
                .select(SENSITIVE_USER_FIELDS)
                .populate('roleId')
                .lean();

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                    status: 401,
                });
            }

            return res.json({
                success: true,
                user: toSafeUser(user),
                status: 200,
            });
        } catch (error) {
            console.error('Error fetching session user:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                status: 500,
            });
        }
    }
};

module.exports = usersController;
