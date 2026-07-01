const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Middleware to protect the scheduler endpoint using a secret key
 */
const protectScheduler = (req, res, next) => {
  const secretKey = process.env.SCHEDULER_SECRET_KEY;
  
  if (!secretKey) {
    return next(
      new AppError('Scheduler secret key is not configured on the server', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  }

  const clientKey = req.headers['x-scheduler-key'];

  if (!clientKey) {
    return next(
      new AppError('Unauthorized: Missing scheduler secret key in x-scheduler-key header', HTTP_STATUS.UNAUTHORIZED)
    );
  }

  if (clientKey !== secretKey) {
    return next(
      new AppError('Unauthorized: Invalid scheduler secret key', HTTP_STATUS.UNAUTHORIZED)
    );
  }

  next();
};

module.exports = {
  protectScheduler
};
