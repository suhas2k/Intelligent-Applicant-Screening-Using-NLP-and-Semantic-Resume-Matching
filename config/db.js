const mongoose = require('mongoose');

let isConnected = false;
let connPromise = null;

const isProductionOrVercel = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');
const isLocalhostUri = (uri) => !uri || /mongodb:\/\/(127\.0\.0\.1|localhost)/i.test(uri);

const connectDB = async () => {
  if (mongoose.connection && mongoose.connection.readyState >= 1) {
    isConnected = true;
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;

  // In Vercel / production environments without an external MongoDB cluster,
  // do not hang waiting for a non-existent localhost database.
  if (isProductionOrVercel && isLocalhostUri(uri)) {
    isConnected = false;
    console.log('[MongoDB Info] Running in serverless/production mode without external MongoDB URI. Using in-memory store.');
    return null;
  }

  const targetUri = uri || 'mongodb://127.0.0.1:27017/applicant_screening';

  if (connPromise) {
    return connPromise;
  }

  connPromise = (async () => {
    try {
      const conn = await mongoose.connect(targetUri, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (error) {
      isConnected = false;
      console.warn(`\n======================================================`);
      console.warn(`[MongoDB Warning] Could not connect to: ${targetUri}`);
      console.warn(`Reason: ${error.message}`);
      console.warn(`Running in high-speed in-memory store mode.`);
      console.warn(`======================================================\n`);
      return null;
    } finally {
      connPromise = null;
    }
  })();

  return connPromise;
};

const getDBStatus = () => {
  const readyState = mongoose.connection ? mongoose.connection.readyState : 0;
  const isOnline = isConnected && readyState === 1;
  return {
    connected: isOnline,
    readyState,
    host: mongoose.connection?.host || 'none',
    database: mongoose.connection?.name || 'none',
    mode: isOnline ? 'MongoDB Atlas / Live' : 'In-Memory Store'
  };
};

module.exports = { connectDB, getDBStatus };
