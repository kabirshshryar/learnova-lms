const User = require('../models/user.model');
const Booking = require('../models/booking.model');
const Transaction = require('../models/transaction.model');
const Review = require('../models/review.model');
const TokenPurchase = require('../models/token-purchase.model');
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

/** List all reviews and ratings */
exports.listAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('student_id', 'name email profilePicture')
      .populate('teacher_id', 'name email profilePicture')
      .populate('gig_id', 'title price')
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.listTokenPurchases = async (req, res) => {
  try {
    const purchases = await TokenPurchase.find()
      .populate('user_id', 'name email walletBalance')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ purchases });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.approveTokenPurchase = async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const purchase = await TokenPurchase.findById(id).session(session);
      if (!purchase) throw new Error('PURCHASE_REQUEST_NOT_FOUND');
      if (purchase.status !== 'pending') {
        throw new Error('PURCHASE_REQUEST_NOT_PENDING');
      }

      const user = await User.findById(purchase.user_id)
        .select('walletBalance')
        .session(session);

      if (!user) throw new Error('USER_NOT_FOUND');

      const balanceBefore = User.walletAmount(user);
      user.walletBalance = balanceBefore + purchase.tokens;
      await user.save({ session });

      purchase.status = 'approved';
      purchase.processedBy = req.user.id;
      purchase.processedAt = new Date();
      await purchase.save({ session });

      await Transaction.create(
        [
          {
            user_id: purchase.user_id,
            operation: 'topup',
            amount: purchase.tokens,
            balanceBefore: balanceBefore,
            balanceAfter: user.walletBalance,
            referenceType: 'wallet_topup',
            referenceId: purchase._id,
            description: `bKash manual token top-up approved by admin. (TrxID: ${purchase.trxId})`,
          },
        ],
        { session }
      );
    });

    res.json({ message: 'Token purchase approved and tokens transferred successfully.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

exports.rejectTokenPurchase = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  try {
    const purchase = await TokenPurchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ message: 'Token purchase request not found' });
    }
    if (purchase.status !== 'pending') {
      return res.status(400).json({ message: 'Purchase request is not pending' });
    }

    purchase.status = 'rejected';
    purchase.note = note || 'Rejected by admin';
    purchase.processedBy = req.user.id;
    purchase.processedAt = new Date();
    await purchase.save();

    res.json({ message: 'Token purchase request rejected.', purchase });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

