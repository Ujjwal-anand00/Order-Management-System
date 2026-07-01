const express = require('express');
const mongoose = require('mongoose');
const { sendSuccess } = require('../../utils/apiResponse');
const { HTTP_STATUS } = require('../../utils/constants');
const orderRoutes = require('./orderRoutes');
const schedulerRoutes = require('./schedulerRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';
  const schedulerStatus = process.env.SCHEDULER_ENABLED !== 'false' ? 'enabled' : 'disabled';
  const environment = process.env.NODE_ENV || 'development';
  const isHealthy = dbStatus === 'up';

  const healthData = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment,
    services: {
      database: dbStatus,
      scheduler: schedulerStatus
    }
  };

  if (!isHealthy) {
    return res.status(503).json({
      status: 'fail',
      data: healthData,
      message: 'MongoDB is disconnected'
    });
  }

  return sendSuccess(res, HTTP_STATUS.OK, healthData, 'Server is healthy');
});

router.use('/orders', orderRoutes);
router.use('/scheduler', schedulerRoutes);

module.exports = router;
