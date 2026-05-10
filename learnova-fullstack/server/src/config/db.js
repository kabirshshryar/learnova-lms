const dns = require('dns');
const mongoose = require('mongoose');
const User = require('../models/user.model');

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;
  const dnsServers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (!mongoURI) {
    throw new Error('MONGO_URI is missing in environment variables.');
  }

  try {
    dns.setServers(dnsServers);
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully.');

    const walletSync = await User.ensureAllWalletBalances();
    if (walletSync.modifiedCount > 0) {
      console.log(
        `Set token wallet balance for ${walletSync.modifiedCount} user(s) missing the field.`
      );
    }
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

module.exports = connectDB;
