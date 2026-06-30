const mongoose = require('mongoose');
const { ORDER_STATUS } = require('../utils/constants');

const orderStatusHistorySchema = new mongoose.Schema(
  {
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    previousStatus: {
      type: String,
      enum: [...Object.values(ORDER_STATUS), null],
      default: null
    },
    newStatus: {
      type: String,
      required: true,
      enum: Object.values(ORDER_STATUS)
    },
    changedBy: {
      type: String,
      required: true,
      default: 'SYSTEM',
      trim: true
    },
    changeReason: {
      type: String,
      trim: true,
      maxlength: 500
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  }
);

const OrderStatusHistory = mongoose.model('OrderStatusHistory', orderStatusHistorySchema);

module.exports = OrderStatusHistory;
