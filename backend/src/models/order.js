const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../utils/constants');

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
      index: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
      match: [/^\+?\d{10,15}$/, 'Please provide a valid phone number'],
      index: true
    },
    productName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than zero']
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING
    },
    currentOrderStatus: {
      type: String,
      required: true,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PLACED,
      index: true
    }
  },
  {
    timestamps: true
  }
);

orderSchema.index({ createdAt: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
