// controller/users.js
const db = require("../../connections/mongo");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const crypto = require('crypto');


const usersController = {
    // Register a new user
    registerUser: async (req, res, next) => {
        try {
            // Extract user data from the request body
            const { firstName, lastName, email, password, phoneNumber, companyname, address ,dateofbirth,payableAccount,address2 } = req.body;
 
            console.log(req.body);
   

            // Check if the email already exists
            let existingEmail = await User.findOne({ email });
            if (existingEmail) {
                return res.json({ message: "Email already exists", status: 400 });
            }

            // Check if the phone number already exists
            let existingPhoneNumber = await User.findOne({ phoneNumber });
            if (existingPhoneNumber) {
                return res.json({ message: "Phone number already exists", status: 400 });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create a new user instance
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

            // Save the user to the database
            await newUser.save();

            
             // Function to send welcome email
            const sendWelcomeEmail = async () => {
                return new Promise((resolve, reject) => {
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: 'zextonshamzahashmi@gmail.com',
                            pass: 'yzwj cscq ybrb moau',
                        },
                    });

                    // HTML template for welcome email
                    const emailContent = `
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Welcome to Zextons</title>
                        </head>
                        <body style="font-family: Arial, sans-serif;">
                        <div style="background-color: #f2f2f2; padding: 20px;">
                            <h1 style="color: #333333;">Welcome to Zextons!</h1>
                            <p style="color: #666666;">Dear ${firstName} ${lastName},</p>
                            <p style="color: #666666;">Thank you for registering with us. We're excited to have you on board and look forward to providing you with the best services.</p>
                            <p style="color: #666666;">If you have any questions or need any assistance, feel free to contact us.</p>
                            <p style="color: #666666;">Best regards,</p>
                            <p style="color: #666666;">The Zextons Team</p>
                        </div>
                        </body>
                        </html>
                    `;

                    const mailOptions = {
                        from: 'zextonshamzahashmi@gmail.com',
                        to: newUser.email,
                        subject: 'Welcome to Zextons!',
                        html: emailContent
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error("Error sending welcome email:", error);
                            reject(error);
                        } else {
                            console.log('Welcome email sent: ' + info.response);
                            resolve(info);
                        }
                    });
                });
            };

            try {
                // Try to send welcome email (but don't wait for it to complete)
                sendWelcomeEmail().catch(emailError => {
                    console.error("Failed to send welcome email:", emailError);
                    // Don't reject here as we don't want to fail the registration
                });

                // Respond with success message immediately
                return res.json({ 
                    message: "User registered successfully", 
                    status: 201, 
                    user: newUser 
                });
                
            } catch (error) {
                console.error("Error in email sending process:", error);
                // Even if email fails, still return success response as user is registered
                return res.json({ 
                    message: "User registered successfully, but welcome email could not be sent", 
                    status: 201, 
                    user: newUser 
                });
            }
        } catch (error) {
            // Handle errors
            console.error("Error registering user:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    registerUserFromAdmin: async (req, res, next) => {
        try {
            // Extract user data from the request body
            const { firstName, lastName, email, password, phoneNumber, companyname, address } = req.body;

            // Check if the email already exists
            let userExist = await User.findOne({ email });
            if (userExist) {
                return res.json({ message: "User already exists", status: 409, user: userExist });
            }

            // Check if the phone number already exists
            let userExistbyPhone = await User.findOne({ phoneNumber });
            if (userExistbyPhone) {
                return res.json({ message: "Phone number already exists", status: 409, user: userExistbyPhone });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create a new user instance
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

            // Save the user to the database
            await newUser.save();

            
             // Send reset password email
             const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'zextonshamzahashmi@gmail.com',
                    pass: 'yzwj cscq ybrb moau',
                },
            });

            // HTML template for welcome email
            const emailContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Zextons</title>
                </head>
                <body style="font-family: Arial, sans-serif;">

                <div style="background-color: #f2f2f2; padding: 20px;">
                    <h1 style="color: #333333;">Welcome to Zextons!</h1>
                    <p style="color: #666666;">Dear ${firstName} ${lastName},</p>
                    <p style="color: #666666;">Your email address is: ${email}</p>
                    <p style="color: #666666;">Your password is: ${password}</p>
                    <p style="color: #666666;">Thank you for registering with us. We're excited to have you on board and look forward to providing you with the best services.</p>
                    <p style="color: #666666;">If you have any questions or need any assistance, feel free to contact us.</p>
                    <p style="color: #666666;">Best regards,</p>
                    <p style="color: #666666;">The Zextons Team</p>
                </div>
                </body>
                </html>
            `;

              // Include the HTML content in the mailOptions
              const mailOptions = {
                from: 'zextonshamzahashmi@gmail.com',
                to: newUser.email,
                subject: 'Welcome to Zextons!',
                html: emailContent // Use the HTML content instead of plain text
            };


            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log("Error sending welcome email:", error);
                    return res.json({ message: 'Error sending welcome email', status: 500 });
                }
                console.log('Welcome email sent: ' + info.response);
            });



            // Respond with success message
            res.json({ message: "User registered successfully", status: 201, user: newUser });
        } catch (error) {
            // Handle errors
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
                role, 
                roleId
            } = req.body;
    
            console.log('Request Params:', req.params);
            console.log('Request Body:', req.body);
            
            // Safely log address if it exists
            if (address && typeof address === 'object') {
                console.log('Address:', address);
            }
    
            // Find the user by ID
            let user = await User.findById(id);
    
            if (!user) {
                return res.status(404).json({ message: "User not found", status: 404 });
            }
    
            // Update user fields
            if (firstname !== undefined) user.firstname = firstname;
            if (lastname !== undefined) user.lastname = lastname;
            if (email !== undefined) user.email = email;
            if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
            if (companyname !== undefined) user.companyname = companyname;
            if (dateofbirth !== undefined) user.dateofbirth = dateofbirth;
            if (role !== undefined) user.role = role;
            if (roleId !== undefined) user.roleId = roleId;
            
            // Update address if provided
            if (address && typeof address === 'object') {
                // Initialize address if it doesn't exist
                user.address = user.address || {};

                // Update address fields
                user.address.address = address.address !== undefined ? address.address : user.address.address;
                user.address.apartment = address.apartment !== undefined ? address.apartment : user.address.apartment;
                user.address.country = address.country !== undefined ? address.country : user.address.country;
                user.address.city = address.city !== undefined ? address.city : user.address.city;
                user.address.county = address.county !== undefined ? address.county : user.address.county;
                user.address.postalCode = address.postalCode !== undefined ? address.postalCode : user.address.postalCode;
            }
    
            // Save the updated user data
            await user.save();
            console.log('Updated User:', user);
    
            // Respond with success message
            res.json({ message: "User updated successfully", status: 201, user });
        } catch (error) {
            console.error("Error updating user:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },
    

    // Login a user
    loginUser: async (req, res, next) => {
        try {
            // Extract login credentials from the request body
            const { email, password, enteredOtp } = req.body;
            console.log(req.body);

            // Find the user in the database by email and populate role permissions
            const user = await User.findOne({ email }).populate('roleId');

            // If user not found, return error
            if (!user) {
                return res.json({ message: "User not found", status: 404 });
            }

            // Compare passwords
            const passwordMatch = await bcrypt.compare(password, user.password);

            // If passwords don't match, return error
            if (!passwordMatch) {
                return res.json({ message: "Invalid password", status: 401 });
            }
            console.log('loged in suer :' , user);
            
            // Prepare user response with role and permissions
            const userResponse = {
                _id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                phoneNumber: user.phoneNumber,
                address: user.address,
                companyname: user.companyname,
                dateofbirth: user.dateofbirth,
                role: user.role,
                userType: user.roleId ? user.roleId.name : null,
                roleId: user.roleId ? user.roleId._id : null,
                permissions: user.roleId ? user.roleId.permissions : null,
                registerForApp: user.registerForApp,
                createdAt: user.createdAt
            };
            
            // If user found and passwords match, return success message with user data including permissions
            return res.json({ message: "Login successful", status: 201, user: userResponse });
        } catch (error) {
            // Handle errors
            console.error("Error logging in user:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    // Logout a user
    logoutUser: async (req, res, next) => {
        try {
            // Here, you can include any logout-related logic you need
            // For example, if using sessions, you might destroy the session
            req.session.destroy((err) => {
                if (err) {
                    console.error("Error destroying session:", err);
                    return res.json({ message: "Error logging out", status: 500 });
                }
                // Respond with success message if session is destroyed successfully
                res.json({ message: "Logout successful", status: 201 });
            });
        } catch (error) {
            // Handle errors
            console.error("Error logging out user:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    // Forgot password
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;
            const user = await User.findOne({ email });

            if (!user) {
                return res.json({ message: "User not found", status: 404 });
            }

            // Generate reset token
            const token = crypto.randomBytes(20).toString('hex');
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + (1 * 3600000); // 5 hours

            await user.save();

            // Send reset password email
            // const transporter = nodemailer.createTransport({
            //     service: 'gmail',
            //     auth: {
            //         user: 'zextonshamzahashmi@gmail.com',
            //         pass: 'yzwj cscq ybrb moau',
            //     },
            // });

                            // Setup nodemailer transporter
            const transporter = nodemailer.createTransport({
                host: 'smtp-relay.brevo.com', 
                port: 465, 
                secure: true, // Use SSL
                auth: {
                    user: '7da4db001@smtp-brevo.com', // Your SMTP login
                    pass: 'UbpWm568BQ4M1tfI', // Your SMTP password
                },
            });
            
                            

            // Create the HTML content for the email template
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
                    <a href="http://Zextons.co.uk/resetpassword/${token}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                </div>
                <p style="color: #666666;">This link will expire in 60 minutes. If you do not reset your password within this time, you will need to request another password reset.</p>
                <p style="color: #666666;">If you did not request a password reset, please ignore this email.</p>
                <p style="color: #666666;">Thank you,</p>
                <p style="color: #666666;">Zextons Team </p>
            </div>
            
            </body>
            </html>
            
            `;

            // Include the HTML content in the mailOptions
            const mailOptions = {
                from: 'order@zextons.co.uk',
                to: user.email,
                subject: 'Reset Password', 
                html: emailContent // Use the HTML content instead of plain text
            };


            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log(error);
                    return res.json({ message: 'Error sending reset password email', status: 500 });
                }
                console.log('Reset password email sent: ' + info.response);
                res.json({ message: 'Reset password email sent', status: 201 });
            });
        } catch (error) {
            console.error("Error in forgotPassword:", error);
            res.json({ message: 'Internal server error', status: 500 });
        }
    },

    // Reset password
    resetPassword: async (req, res) => {
        try {
            const { token, newPassword } = req.body;
            const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });

            if (!user) {
                return res.json({ message: 'Invalid or expired token', status: 400 });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            res.json({ message: 'Password reset successful', status: 201 });
        } catch (error) {
            console.error("Error in resetPassword:", error);
            res.json({ message: 'Internal server error', status: 500 });
        }
    },

    // Change password
    changepassword: async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body;
            const { id } = req.params; // Assuming 'id' here is the userId
            console.log('Request Body:', req.body);
            console.log('Request Params:', req.params);
    
            // Find the user by ID
            const user = await User.findById(id);
    
            // Check if user exists
            if (!user) {
                return res.json({ message: 'User not found', status: 404 });
            }
    
            // Compare oldPassword with hashed password in database
            const isMatch = await bcrypt.compare(oldPassword, user.password);
    
            // If passwords don't match, return error
            if (!isMatch) {
                return res.json({ message: 'Invalid old password', status: 400 });
            }
    
            // Hash the new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
    
            // Update user's password
            user.password = hashedPassword;
            await user.save();
    
            // Return success response
            return res.json({ message: 'Password changed successfully', status: 201 });
        } catch (error) {
            console.error("Error in changepassword:", error);
            return res.json({ message: 'Internal server error', status: 500 });
        }
    }


};

module.exports = usersController;

