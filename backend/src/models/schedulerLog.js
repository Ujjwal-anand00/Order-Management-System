const mongoose = require('mongoose');
const { SCHEDULER_STATUS } = require('../utils/constants');

const schedulerLogSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true,
      index: true
    },
    endTime: {
      type: Date,
      required: true
    },
    totalOrdersChecked: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    totalOrdersUpdated: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(SCHEDULER_STATUS)
    },
    errorMessage: {
      type: String,
      trim: true
    }
  }
);

const SchedulerLog = mongoose.model('SchedulerLog', schedulerLogSchema);

module.exports = SchedulerLog;
