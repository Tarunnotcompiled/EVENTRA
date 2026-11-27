const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventra';

async function connectDB() {
  await mongoose.connect(URI);
  console.log('MongoDB connected');
}

module.exports = connectDB;
