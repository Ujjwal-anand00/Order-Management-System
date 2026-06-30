const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../utils/constants');

const notFound = (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, HTTP_STATUS.NOT_FOUND));
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  err.status = err.status || 'error';

  const response = {
    status: err.status,
    message: err.message
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(err.statusCode).json(response);
};

module.exports = {
  notFound,
  errorHandler
};
