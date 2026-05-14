const express = require('express');
const authRoutes = require('./auth.routes');
const gigRoutes = require('./gig.routes');
const bookingRoutes = require('./booking.routes');
const walletRoutes = require('./wallet.routes');
const withdrawalRoutes = require('./withdrawal.routes');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to Learnova API' });
});

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Learnova API is running' });
});

router.use('/auth', authRoutes);
router.use('/gigs', gigRoutes);
router.use('/bookings', bookingRoutes);
router.use('/wallet', walletRoutes);
router.use('/withdrawals', withdrawalRoutes);

module.exports = router;

