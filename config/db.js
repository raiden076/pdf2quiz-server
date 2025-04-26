require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;

const clientOptions = {
  serverApi: { version: '1', strict: true, deprecationErrors: true },
};

const connectDB = async () => {
  if (!uri) {
    console.error('MONGODB_URI is not defined');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, clientOptions);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Error connecting to mongodb: ${err.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };
