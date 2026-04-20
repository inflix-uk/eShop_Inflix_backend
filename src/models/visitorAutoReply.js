// models/visitorAutoReply.js
const mongoose = require('mongoose');

const visitorAutoReplySchema = new mongoose.Schema({
    isEnabled: {
        type: Boolean,
        default: false
    },
    // Days when business is OPEN (auto-reply will be sent on days NOT in this list)
    // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
    businessDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5],  // Monday to Friday by default
        validate: {
            validator: function(arr) {
                return arr.every(day => day >= 0 && day <= 6);
            },
            message: 'Days must be between 0 (Sunday) and 6 (Saturday)'
        }
    },
    startTime: {
        type: String,  // Format: "HH:mm" in 24-hour format (UK London time) - Business OPENS
        required: true
    },
    endTime: {
        type: String,  // Format: "HH:mm" in 24-hour format (UK London time) - Business CLOSES
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
visitorAutoReplySchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('VisitorAutoReply', visitorAutoReplySchema);
