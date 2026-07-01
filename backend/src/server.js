require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');
const { startCronScheduler } = require('./cron/scheduler');

const port = process.env.PORT || 5000;

// Validate that critical environment variables exist
if (!process.env.MONGODB_URI) {
  console.error('Fatal Startup Error: MONGODB_URI is not defined in the environment variables.');
  process.exit(1);
}

/**
 * Startup sequence:
 * 1. Connect to MongoDB Atlas (fail fast if offline or un-whitelisted)
 * 2. Start HTTP server listening for connections
 * 3. Initialize background Scheduler
 */
const startServer = async () => {
  try {
    console.log('Environment variables loaded.');
    
    // Connect to database and block until connection completes
    await connectDB();
    
    // Start Express listener
    const server = app.listen(port, () => {
      console.log(`Express server started in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
      
      // Initialize background cron scheduler
      try {
        startCronScheduler();
      } catch (cronErr) {
        console.error(`[Scheduler] Initialization failed: ${cronErr.message}`);
      }
    });

    // Setup graceful shutdowns
    const gracefulShutdown = (signal) => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          await mongoose.connection.close();
          console.log('MongoDB connection closed.');
          process.exit(0);
        } catch (err) {
          console.error(`Error during shutdown: ${err.message}`);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      console.error(`Unhandled Rejection: ${err.message}`);
      server.close(() => {
        process.exit(1);
      });
    });

    process.on('uncaughtException', (err) => {
      console.error(`Uncaught Exception: ${err.message}`);
      process.exit(1);
    });

  } catch (error) {
    console.error('\n❌ Server startup failed!');
    console.error(error.message);
    process.exit(1);
  }
};

startServer();
