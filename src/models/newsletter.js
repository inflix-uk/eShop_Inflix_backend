const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const newsletterSchema = new Schema({
    fullName: {
        type: String,
        default: null,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    mode: {
        type: String,
        required: true,
        enum: [
            'website',
            'homepage',
            'checkout',
            'product',
            'content_widget', // blog / homepage content newsletter block
            'homepage_widgets', // dedicated homepage widget (HomeClient)
            'footer_cms', // footer settings newsletter block (NewsletterSignupWidget)
        ],
        default: 'website',
    },
    subscribedAt: {
        type: Date,
        default: Date.now, // Automatically store the date of subscription
    }
});

const Newsletter = mongoose.model('Newsletter', newsletterSchema);

module.exports = Newsletter;
