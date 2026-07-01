const express = require('express');
const schedulerController = require('../../controllers/schedulerController');
const { protectScheduler } = require('../../middleware/authMiddleware');

const router = express.Router();

// POST /api/v1/scheduler/run
// Secured using secret key validation header
router.post('/run', protectScheduler, schedulerController.runScheduler);

module.exports = router;
