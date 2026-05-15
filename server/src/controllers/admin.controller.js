// server/src/controllers/admin.controller.js
const User = require('../models/user.model');
const Booking = require('../models/booking.model');
const { getIO } = require('../utils/socket');

/** List pending users (status === 'pending') */
exports.listPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' }).select('-password');
    res.json({ users });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** Approve a user – set status to 'active' */
exports.approveUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByIdAndUpdate(id, { status: 'active' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `User ${user.email} approved`, user });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** List pending bookings (status === 'pending') */
exports.listPendingBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'pending' })
      .populate('teacher_id', 'name')
      .populate('student_id', 'name')
      .populate('gig_id', 'title');
    res.json({ bookings });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** Approve a booking – set status to 'confirmed' */
exports.approveBooking = async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'pending') return res.status(400).json({ message: 'Booking not pending' });

    booking.status = 'confirmed';
    await booking.save();

    // Notify participants via socket
    const io = getIO();
    if (io) {
      io.to(`user:${booking.student_id}`).emit('booking:status_updated', {
        message: 'Your session has been approved',
        bookingId: booking._id,
        status: 'confirmed',
      });
      io.to(`user:${booking.teacher_id}`).emit('booking:status_updated', {
        message: 'A session has been approved',
        bookingId: booking._id,
        status: 'confirmed',
      });
    }

    res.json({ message: 'Booking approved', booking });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
