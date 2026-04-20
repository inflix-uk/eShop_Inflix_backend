const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NavbarSchema = new Schema({
    itemType: {
        type: String,
        enum: ['category', 'custom'],
        default: 'category'
    },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: 'productCategories',
        default: null
    },
    customLabel: {
        type: String,
        default: '',
        trim: true,
        maxlength: 100
    },
    customPath: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const Navbar = mongoose.model('Navbar', NavbarSchema);

module.exports = Navbar;
