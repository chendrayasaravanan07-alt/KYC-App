const mongoose = require('mongoose');
const winston = require('winston');

/**
 * MongoDB Connection Utility
 * Handles database connection with retry logic and error handling
 */

const connectDB = async () => {
  try {
    // Validate environment variables
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    // Configure mongoose options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maximum number of connections in the pool
      serverSelectionTimeoutMS: 5000, // How long to try selecting a new server before giving up
      socketTimeoutMS: 45000, // How long a send or receive on a socket can take before timing out
      family: 4, // Use IPv4, skip trying IPv6
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoUri, options);

    winston.info(` MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('connected', () => {
      winston.info(' Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      winston.error(`L Mongoose connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      winston.warn('  Mongoose disconnected from MongoDB');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      winston.info('= MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    winston.error(`L Database Connection Error: ${error.message}`);

    // Retry connection with exponential backoff
    if (process.env.NODE_ENV !== 'test') {
      setTimeout(() => {
        winston.info('= Retrying database connection...');
        connectDB();
      }, 5000);
    }

    process.exit(1);
  }
};

// Database health check function
const checkDatabaseHealth = async () => {
  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      status: states[state],
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      healthy: state === 1
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      healthy: false
    };
  }
};

module.exports = {
  connectDB,
  checkDatabaseHealth
};