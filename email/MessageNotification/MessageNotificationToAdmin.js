const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com', 
    port: 465, 
    secure: true, // Use SSL
    auth: {
        user: '7da4db001@smtp-brevo.com', // Your SMTP login
        pass: 'UbpWm568BQ4M1tfI', // Your SMTP password
    },
});

const replaceTemplateVariables = (template, data) => {
    // Replace user details
    return template
        .replace('{{user.firstname}}', data.user.firstname || '')
        .replace('{{user.lastname}}', data.user.lastname || '')
        .replace('{{user.email}}', data.user.email || '');
};

const sendMessageNotification = async (userData) => {
    try {
        // Read the email template
        const templatePath = path.join(__dirname, 'templateForAdmin.html');
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        
        // Replace variables in the template
        const htmlContent = replaceTemplateVariables(templateContent, {
            user: userData.user || { firstname: 'Admin', lastname: '', email: '' }
        });

        const mailOptions = {
            from: 'Zextons <support@zextons.co.uk>',
            to: "order@zextons.co.uk",
            subject: 'New Message from Zexton Support',
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        console.log('Message notification email sent successfully to:', userData.user.email);
        return true;
    } catch (error) {
        console.error('Error sending message notification email:', error);
        return false;
    }
};

module.exports = {
    sendMessageNotification
};
