const mongoose = require('mongoose');

const visitorAwayStatusSchema = new mongoose.Schema({
    isAway: {
        type: Boolean,
        default: false
    },
    message: {
        type: String,
        default: "Hi! We're currently away from our desk. We'll respond to your message as soon as we're back. Thank you for your patience!"
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Ensure only one document exists
visitorAwayStatusSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('VisitorAwayStatus', visitorAwayStatusSchema);
