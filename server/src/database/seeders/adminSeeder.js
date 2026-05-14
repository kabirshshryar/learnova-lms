const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const User = require('../../models/user.model');
const connectDB = require('../../config/db');

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = 'admin@learnova.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('Admin user already exists.');
      process.exit(0);
    }

    const adminUser = new User({
      name: 'System Admin',
      email: adminEmail,
      password: 'password123', // Will be hashed by pre-save hook
      roles: ['admin'],
    });

    await adminUser.save();
    console.log('Example admin account seeded successfully.');
    console.log('Email: admin@learnova.com');
    console.log('Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error.message);
    process.exit(1);
  }
};

seedAdmin();
