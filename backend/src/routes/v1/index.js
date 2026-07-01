const express = require('express');
const mongoose = require('mongoose');
const { sendSuccess } = require('../../utils/apiResponse');
const { HTTP_STATUS } = require('../../utils/constants');
const orderRoutes = require('./orderRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';
  const status = dbStatus === 'up' ? 'healthy' : 'unhealthy';

  sendSuccess(res, HTTP_STATUS.OK, {
    status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus
    }
  });
});

router.use('/orders', orderRoutes);

module.exports = router;
