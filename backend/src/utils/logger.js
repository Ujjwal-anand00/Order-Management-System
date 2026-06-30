const logger = {
  info: (message) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  },
  warn: (message) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
  },
  error: (message, error = null) => {
    if (error && error.stack) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}\n${error.stack}`);
    } else {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    }
  }
};

module.exports = logger;
