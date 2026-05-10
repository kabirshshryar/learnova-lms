require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./utils/socket');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed (SIGINT).');
    process.exit(0);
  } catch (error) {
    console.error('Error during SIGINT shutdown:', error.message);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed (SIGTERM).');
    process.exit(0);
  } catch (error) {
    console.error('Error during SIGTERM shutdown:', error.message);
    process.exit(1);
  }
});

startServer();

