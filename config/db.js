const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/applicant_screening';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    isConnected = false;
    console.warn(`\n======================================================`);
    console.warn(`[MongoDB Warning] Could not connect to MongoDB at: ${uri}`);
    console.warn(`Reason: ${error.message}`);
    console.warn(`------------------------------------------------------`);
    console.warn(`To run with a live MongoDB database, please either:`);
    console.warn(`  1. Start MongoDB locally (e.g., 'net start MongoDB' or 'mongod')`);
    console.warn(`  2. Set MONGODB_URI in your .env to a MongoDB Atlas cluster`);
    console.warn(`======================================================\n`);
    
    // Do not terminate process; allow the server to notify users in the API if DB is unreachable
    return null;
  }
};

const getDBStatus = () => {
  return {
    connected: isConnected && mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || 'none',
    database: mongoose.connection.name || 'none'
  };
};

module.exports = { connectDB, getDBStatus };
