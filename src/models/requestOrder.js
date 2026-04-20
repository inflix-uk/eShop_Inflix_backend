const mongoose = require('mongoose');

const requestOrderSchema = new mongoose.Schema({
  requestOrderNumber: {
    type: String,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  status: {
    type: String,
    default: 'Pending',
  },
  reason: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  converted: {
    type: Boolean,
    default: false,
  },
  convertedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  files: [],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to set the requestOrderNumber before saving
requestOrderSchema.pre('save', async function (next) {
  if (!this.isNew) {
    return next();
  }

  const lastOrder = await mongoose.model('RequestOrder').findOne().sort({ createdAt: -1 });

  let newNumber = 1;
  if (lastOrder && lastOrder.requestOrderNumber) {
    const match = lastOrder.requestOrderNumber.match(/(\d+)$/);
    if (match) {
      newNumber = parseInt(match[1], 10) + 1;
    }
  }

  this.requestOrderNumber = `RIM-${newNumber.toString().padStart(3, '0')}`;
  next();
});

// Middleware to update the updatedAt field
requestOrderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('RequestOrder', requestOrderSchema);
