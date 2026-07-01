const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Reusable Joi validation middleware
 * @param {Object} schema - Joi schema object
 * @param {string} property - req property to validate (body, query, params)
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false // Strictly reject invalid/unsupported fields
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      const err = new AppError('Validation failed', HTTP_STATUS.BAD_REQUEST);
      err.errors = details;
      return next(err);
    }

    // Replace request property with validated/sanitized value
    req[property] = value;
    next();
  };
};

module.exports = validate;
