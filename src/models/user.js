// models/user.js
const mongoose = require('mongoose');



const userSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    dateofbirth: {
        type: Date,
        default: null
        },
    password: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        default: null
    },
    address: {
        type: Object,
        default: null
    },
    sellerType: {
        type: String,
        default: null
    },
    address2: {
        type: String,
        default:null
    },
    payableAccount:[],
    companyname: {
        type: String,
        default: null
    },
    role: {
        type: String,
        default: "user"
    },
    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RoleAndPermissons',
        default: null
    },
    pricingGroup: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PricingGroup',
        default: null
    },
    registerForApp: {
        type: Boolean,
        default: false
    },
    otp:String,
    otpExpires:Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },

});

module.exports = mongoose.model('User', userSchema);

