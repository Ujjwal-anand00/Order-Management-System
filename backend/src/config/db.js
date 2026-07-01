const mongoose = require('mongoose');

/**
 * Helper to establish connection to MongoDB database
 * @returns {Promise<Object>} Mongoose connection instance
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is missing.');
  }

  // Connection options to fail fast on outages and specify fallback DB name
  const options = {
    serverSelectionTimeoutMS: 5000, // Wait max 5 seconds before timeout (instead of 30 seconds)
    dbName: 'order_management_system' // Fallback db name if not specified in URI string
  };

  try {
    console.log('Connecting to MongoDB database...');
    const conn = await mongoose.connect(uri, options);
    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    let advisory = '';
    
    // Check if error is related to Atlas connectivity / Server selection
    if (
      error.name === 'MongooseServerSelectionError' ||
      error.message.includes('Could not connect to any servers') ||
      error.message.includes('server selection')
    ) {
      advisory = `
========================================================================
🚨 DIAGNOSTIC ADVISORY: MONGODB ATLAS CONNECTIVITY FAILURE (IP WHITELIST)
========================================================================
The connection timed out while trying to reach your MongoDB Atlas cluster.
This usually means your current network IP address is not whitelisted.

ACTION REQUIRED:
1. Sign in to your MongoDB Atlas Console (https://cloud.mongodb.com).
2. Go to Security -> Network Access in the left menu.
3. Click "Add IP Address".
4. Choose "Allow Access From Anywhere" (0.0.0.0/0) or "Add Current IP Address".
5. Save changes and wait a minute for Atlas to update.
========================================================================`;
    } else if (error.message.includes('Authentication failed') || error.message.includes('auth')) {
      advisory = `
========================================================================
🚨 DIAGNOSTIC ADVISORY: MONGODB AUTHENTICATION FAILURE
========================================================================
The database user credentials provided in your connection URI are incorrect.

ACTION REQUIRED:
1. Verify the username and password inside your backend/.env MONGODB_URI.
2. Confirm the database user exists in Atlas under Security -> Database Access.
========================================================================`;
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('EAI_AGAIN')) {
      advisory = `
========================================================================
🚨 DIAGNOSTIC ADVISORY: DNS / NETWORK RESOLUTION FAILURE
========================================================================
The cluster domain name could not be resolved.

ACTION REQUIRED:
1. Check your internet connection.
2. Ensure you have entered the correct cluster URL in MONGODB_URI.
========================================================================`;
    }

    const customError = new Error(`${error.message}${advisory}`);
    customError.originalError = error;
    throw customError;
  }
};

module.exports = connectDB;
