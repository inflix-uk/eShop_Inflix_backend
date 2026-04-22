const fs = require('fs').promises;
const path = require('path');
const { sendMail } = require('../../src/utils/mailer');

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
            to: "order@zextons.co.uk",
            subject: 'New Message from Zexton Support',
            html: htmlContent
        };

        await sendMail(mailOptions);
        console.log('Message notification email sent successfully to:', userData.user.email);
        return true;
    } catch (error) {
        console.error('Error sending message notification email:', error);
        return false;
    }
};

module.exports = {
    sendMessageNotification,
    sendMessageNotificationToAdmin: sendMessageNotification,
};
