const mongoose = require('mongoose');

let cached = global._mongoConn || null;

const connectDB = async () => {
  if (cached && mongoose.connection.readyState === 1) return cached;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set. Add it to Vercel Environment Variables or your .env file.');
  }

  try {
    cached = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    global._mongoConn = cached;
    console.log('✅ MongoDB Connected:', mongoose.connection.host);
    return cached;
  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
    throw err;
  }
};

module.exports = connectDB;
