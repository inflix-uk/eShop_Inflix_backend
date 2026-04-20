// models/user.js
const mongoose = require('mongoose');



const roleAndPermissonsSchema = new mongoose.Schema({
    name: {
        type: String,
        default: null
    },
    description: {
        type: String,
        default: null
    },
    permissions: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
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

module.exports = mongoose.model('RoleAndPermissons', roleAndPermissonsSchema);

