const sendSuccess = (res, statusCode, data, message = null) => {
  const response = {
    status: 'success',
    data
  };
  if (message !== null) {
    response.message = message;
  }
  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess
};
