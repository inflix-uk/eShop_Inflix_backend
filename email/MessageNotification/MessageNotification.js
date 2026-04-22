const fs = require('fs').promises;
const path = require('path');
const { sendMail } = require('../../src/utils/mailer');

const replaceTemplateVariables = (template, data) => {
    // Replace user details
    template = template.replace('{{user.firstname}}', data.user.firstname || '');
    template = template.replace('{{user.lastname}}', data.user.lastname || '');
    
    // Replace portal URL
    template = template.replace('{{portalUrl}}', data.portalUrl || 'https://zextons.co.uk/login');
    
    return template;
};

const sendMessageNotification = async (userData) => {
    try {
        // Read the email template
        const templatePath = path.join(__dirname, 'template.html');
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        
        // Replace variables in the template
        const htmlContent = replaceTemplateVariables(templateContent, userData);

        const mailOptions = {
            to: userData.user.email,
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
    sendMessageNotification
};
