const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../utils/constants');

const notFound = (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, HTTP_STATUS.NOT_FOUND));
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'An unexpected error occurred';
  let errors = err.errors || undefined;

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = `Invalid format for field ${err.path}: ${err.value}`;
  }

  // Handle Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Validation failed';
    errors = Object.values(err.errors).map(el => ({
      field: el.path,
      message: el.message
    }));
  }

  // Handle MongoDB duplicate key error
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field value entered. The field '${field}' must be unique.`;
    errors = [{
      field,
      message: `The value '${err.keyValue[field]}' is already in use.`
    }];
  }

  const response = {
    status: statusCode.toString().startsWith('4') ? 'fail' : 'error',
    message
  };

  if (errors) {
    response.errors = errors;
  }

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  notFound,
  errorHandler
};
