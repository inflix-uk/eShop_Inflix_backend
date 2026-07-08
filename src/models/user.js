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
    /** Per-user product exclusions — no user-specific custom prices for these products. */
    excludedProductIds: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
        default: [],
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

// Serves the CRM customers list (listCustomers): sort by createdAt desc with
// skip/limit. Without it, filtering { role: { $ne: 'admin' } } forced an
// in-memory sort of the whole users collection on every page load.
userSchema.index({ createdAt: -1 });
// Serves getUsersByRole (find by roleId) and getAllRole, which runs a
// countDocuments({ roleId }) per role — without this each count was a full
// collection scan of the users collection.
userSchema.index({ roleId: 1 });

const stripSensitiveUserFields = (_doc, ret) => {
  delete ret.password;
  delete ret.resetPasswordToken;
  delete ret.resetPasswordExpires;
  delete ret.otp;
  delete ret.otpExpires;
  delete ret.__v;
  return ret;
};

userSchema.set('toJSON', { virtuals: true, transform: stripSensitiveUserFields });
userSchema.set('toObject', { virtuals: true, transform: stripSensitiveUserFields });

module.exports = mongoose.model('User', userSchema);

