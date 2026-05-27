const User = require('../models/user.model');
const Booking = require('../models/booking.model');
const Transaction = require('../models/transaction.model');
const { getIO } = require('../utils/socket');
const mongoose = require('mongoose');

/** List all users */
exports.listAllUsers = async (req, res) => {
  try {
    const users = await User.find({ status: { $ne: 'deleted' } }).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

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

/** Update user status (restrict/delete/active) */
exports.updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowed = ['active', 'restricted', 'deleted'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const user = await User.findByIdAndUpdate(id, { status }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `User status updated to ${status}`, user });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};





/** List completed bookings awaiting payout approval */
exports.listCompletedBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      status: 'completed',
      escrowStatus: 'held'
    })
      .populate('teacher_id', 'name email')
      .populate('student_id', 'name email')
      .populate('gig_id', 'title price');
    res.json({ bookings });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** Approve payout for a completed session */
exports.approvePayout = async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findById(id).session(session);
      if (!booking) throw new Error('BOOKING_NOT_FOUND');
      if (booking.status !== 'completed' || booking.escrowStatus !== 'held') {
        throw new Error('INVALID_BOOKING_STATE');
      }

      const teacher = await User.findById(booking.teacher_id)
        .select('withdrawableBalance')
        .session(session);

      if (!teacher) throw new Error('TEACHER_NOT_FOUND');

      const withdrawableBefore = User.withdrawableAmount(teacher);
      teacher.withdrawableBalance = withdrawableBefore + booking.escrowAmount;
      await teacher.save({ session });

      booking.escrowStatus = 'released';
      await booking.save({ session });

      await Transaction.create(
        [
          {
            user_id: booking.teacher_id,
            operation: 'topup',
            amount: booking.escrowAmount,
            balanceBefore: withdrawableBefore,
            balanceAfter: teacher.withdrawableBalance,
            referenceType: 'booking',
            referenceId: booking._id,
            description: 'Escrow released by admin after session review.',
          },
        ],
        { session }
      );
    });

    res.json({ message: 'Payout approved successfully.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};
