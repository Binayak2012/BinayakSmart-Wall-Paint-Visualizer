const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = 'mongodb://localhost:27017/Binayak';
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`MongoDB Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;