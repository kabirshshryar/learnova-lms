const express = require('express');
const {
  createBooking,
  updateBookingStatus,
  getMyBookings,
} = require('../controllers/booking.controller');
const {
  verifyToken,
  requireStudentRole,
  requireTeacherRole,
} = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', verifyToken, requireStudentRole, createBooking);
router.get('/me', verifyToken, getMyBookings);
router.patch('/:id/status', verifyToken, requireTeacherRole, updateBookingStatus);

module.exports = router;
