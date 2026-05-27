const mongoose = require('mongoose');
const Booking = require('../models/booking.model');
const Gig = require('../models/gig.model');
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');
const { getIO } = require('../utils/socket');

const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  let populatedBooking = null;

  try {
    const { gig_id, time } = req.body;

    if (!gig_id || !time) {
      return res
        .status(400)
        .json({ message: 'gig_id and time are required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(gig_id)) {
      return res.status(400).json({ message: 'Invalid gig ID.' });
    }

    const bookingTime = new Date(time);
    if (Number.isNaN(bookingTime.getTime())) {
      return res.status(400).json({ message: 'Invalid booking time.' });
    }

    if (bookingTime <= new Date()) {
      return res.status(400).json({
        message: 'Booking time must be in the future.',
      });
    }

    const gig = await Gig.findById(gig_id).select('teacher_id price');
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found.' });
    }

    const studentId = req.user.id;
    const teacherId = gig.teacher_id.toString();

    if (studentId === teacherId) {
      return res.status(400).json({
        message: 'You cannot book your own gig.',
      });
    }

    const student = await User.findById(studentId).select('walletBalance');
    if (!student) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const balance = User.walletAmount(student);
    if (balance < gig.price) {
      return res.status(400).json({
        message: 'Insufficient tokens to book this gig.',
      });
    }

    const existingBooking = await Booking.findOne({
      student_id: studentId,
      gig_id,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (existingBooking) {
      return res.status(409).json({
        message: 'You already have an active booking for this gig.',
      });
    }

    let createdBooking;

    await session.withTransaction(async () => {
      const bookingDocs = await Booking.create(
        [
          {
            student_id: studentId,
            teacher_id: teacherId,
            gig_id,
            time: bookingTime,
            price: gig.price,
            escrowAmount: gig.price,
            escrowStatus: 'held',
          },
        ],
        { session }
      );

      createdBooking = bookingDocs[0];
      createdBooking.meetingRoom = `learnova-booking-${createdBooking._id.toString()}`;
      await createdBooking.save({ session });

      const studentForUpdate = await User.findById(studentId)
        .select('walletBalance')
        .session(session);

      if (!studentForUpdate) {
        throw new Error('USER_NOT_FOUND');
      }

      const beforeBalance = User.walletAmount(studentForUpdate);
      if (beforeBalance < gig.price) {
        throw new Error('INSUFFICIENT_TOKENS');
      }

      studentForUpdate.walletBalance = beforeBalance - gig.price;
      await studentForUpdate.save({ session });

      await Transaction.create(
        [
          {
            user_id: studentId,
            operation: 'debit',
            amount: gig.price,
            balanceBefore: beforeBalance,
            balanceAfter: studentForUpdate.walletBalance,
            referenceType: 'booking',
            referenceId: createdBooking._id,
            description: 'Tokens moved to escrow for booking creation.',
          },
        ],
        { session }
      );
    });

    populatedBooking = await Booking.findById(createdBooking._id)
      .populate('student_id', 'name email')
      .populate('teacher_id', 'name email')
      .populate('gig_id', 'title description duration price');

    const io = getIO();
    if (io && populatedBooking) {
      io.to(`user:${populatedBooking.student_id._id.toString()}`).emit(
        'booking:created',
        {
          bookingId: populatedBooking._id,
          status: populatedBooking.status,
          meetingRoom: populatedBooking.meetingRoom || '',
          message: 'New booking created successfully.',
        }
      );
      io.to(`user:${populatedBooking.teacher_id._id.toString()}`).emit(
        'booking:created',
        {
          bookingId: populatedBooking._id,
          status: populatedBooking.status,
          meetingRoom: populatedBooking.meetingRoom || '',
          message: 'A new booking has been assigned to you.',
        }
      );
    }

    return res.status(201).json({
      message: 'Booking created successfully.',
      booking: populatedBooking,
    });
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(401).json({ message: 'User not found.' });
    }
    if (error.message === 'INSUFFICIENT_TOKENS') {
      return res.status(400).json({
        message: 'Insufficient tokens to hold in escrow for this booking.',
      });
    }
    return res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

const updateBookingStatus = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { status, meetingLink } = req.body;
    const allowedStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    const transitionMap = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid booking ID.' });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status value.',
      });
    }

    await session.withTransaction(async () => {
      const booking = await Booking.findById(id).session(session);
      if (!booking) {
        throw new Error('BOOKING_NOT_FOUND');
      }

      const actor = await User.findById(req.user.id).select('roles').session(session);
      if (!actor) {
        throw new Error('USER_NOT_FOUND');
      }

      const actorRoles = Array.isArray(actor.roles) ? actor.roles : [];
      const isOwnerTeacher = booking.teacher_id.toString() === req.user.id;

      // If approving (confirming), it MUST be the teacher.
      if (status === 'confirmed' && !isOwnerTeacher) {
        throw new Error('ONLY_TEACHER_CAN_APPROVE');
      }

      const isAdmin = actorRoles.includes('admin');
      if (!isAdmin && !isOwnerTeacher) {
        throw new Error('NOT_BOOKING_OWNER');
      }

      const previousStatus = booking.status;

      if (status !== previousStatus) {
        const allowedNextStatuses = transitionMap[previousStatus] || [];
        if (!allowedNextStatuses.includes(status)) {
          throw new Error('INVALID_STATUS_TRANSITION');
        }
      }

      // Refund escrowed tokens to student on cancellation.
      if (status === 'cancelled' && booking.escrowStatus === 'held') {
        const student = await User.findById(booking.student_id)
          .select('walletBalance')
          .session(session);

        if (!student) {
          throw new Error('STUDENT_NOT_FOUND');
        }
        const balanceBefore = User.walletAmount(student);
        student.walletBalance = balanceBefore + booking.escrowAmount;
        await student.save({ session });

        booking.escrowStatus = 'refunded';

        await Transaction.create(
          [
            {
              user_id: booking.student_id,
              operation: 'refund',
              amount: booking.escrowAmount,
              balanceBefore,
              balanceAfter: student.walletBalance,
              referenceType: 'booking',
              referenceId: booking._id,
              description: 'Escrow refunded after booking cancellation.',
            },
          ],
          { session }
        );
      }

      // Escrow release logic removed from here. Admin will manually release it after review.

      if (status === 'confirmed' && meetingLink) {
        booking.meetingLink = meetingLink;
      }

      booking.status = status;
      await booking.save({ session });
    });

    const updatedBooking = await Booking.findById(id)
      .populate('student_id', 'name email walletBalance')
      .populate('teacher_id', 'name email')
      .populate('gig_id', 'title price');

    const io = getIO();
    if (io) {
      io.to(`user:${updatedBooking.student_id._id.toString()}`).emit(
        'booking:status_updated',
        {
          bookingId: updatedBooking._id,
          status: updatedBooking.status,
          meetingRoom: updatedBooking.meetingRoom || '',
          message: `Booking status changed to ${updatedBooking.status}.`,
        }
      );
      io.to(`user:${updatedBooking.teacher_id._id.toString()}`).emit(
        'booking:status_updated',
        {
          bookingId: updatedBooking._id,
          status: updatedBooking.status,
          meetingRoom: updatedBooking.meetingRoom || '',
          message: `Booking status changed to ${updatedBooking.status}.`,
        }
      );
    }

    return res.status(200).json({
      message: 'Booking status updated successfully.',
      booking: updatedBooking,
    });
  } catch (error) {
    if (error.message === 'BOOKING_NOT_FOUND') {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(401).json({ message: 'User not found.' });
    }
    if (error.message === 'NOT_BOOKING_OWNER') {
      return res.status(403).json({
        message: 'Access denied. Only the owner teacher can update this booking.',
      });
    }
    if (error.message === 'ONLY_TEACHER_CAN_APPROVE') {
      return res.status(403).json({
        message: 'Access denied. Only the assigned teacher can approve this session.',
      });
    }
    if (error.message === 'STUDENT_NOT_FOUND') {
      return res.status(404).json({ message: 'Student not found.' });
    }
    if (error.message === 'TEACHER_NOT_FOUND') {
      return res.status(404).json({ message: 'Teacher not found.' });
    }
    if (error.message === 'INSUFFICIENT_TOKENS') {
      return res.status(400).json({
        message: 'Insufficient tokens in student wallet for confirmation.',
      });
    }
    if (error.message === 'INVALID_STATUS_TRANSITION') {
      return res.status(400).json({
        message:
          'Invalid booking status transition. Allowed lifecycle: pending -> confirmed -> completed, with cancellation allowed from pending or confirmed.',
      });
    }
    return res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

const getMyBookings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('roles');
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const isTeacher = roles.includes('instructor') || roles.includes('admin');
    const isStudent = roles.includes('student') || roles.includes('admin');

    const filters = [];
    if (isStudent) {
      filters.push({ student_id: req.user.id });
    }
    if (isTeacher) {
      filters.push({ teacher_id: req.user.id });
    }

    if (!filters.length) {
      return res.status(403).json({
        message: 'Access denied. Student or teacher role is required.',
      });
    }

    const bookings = await Booking.find({ $or: filters })
      .sort({ createdAt: -1 })
      .populate('student_id', 'name email')
      .populate('teacher_id', 'name email')
      .populate('gig_id', 'title price duration');

    return res.status(200).json({ bookings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid booking ID.' });
    }

    const booking = await Booking.findById(id).select('student_id teacher_id');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const isParticipant =
      booking.student_id.toString() === req.user.id ||
      booking.teacher_id.toString() === req.user.id;

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const Message = require('../models/message.model');
    const messages = await Message.find({ booking_id: id }).sort({ createdAt: 1 });

    return res.status(200).json({ messages });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBooking,
  updateBookingStatus,
  getMyBookings,
  getChatHistory,
};
