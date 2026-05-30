const express = require('express');
const {
  createBooking,
  updateBookingStatus,
  getMyBookings,
  getChatHistory,
  createReview,
} = require('../controllers/booking.controller');
const {
  verifyToken,
  requireStudentRole,
} = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', verifyToken, requireStudentRole, createBooking);
router.get('/me', verifyToken, getMyBookings);
router.get('/:id/chat', verifyToken, getChatHistory);
router.patch('/:id/status', verifyToken, updateBookingStatus);
router.post('/:id/review', verifyToken, createReview);

module.exports = router;
