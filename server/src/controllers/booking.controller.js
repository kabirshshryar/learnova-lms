const mongoose = require('mongoose');
const Booking = require('../models/booking.model');
const Gig = require('../models/gig.model');
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');
const Notification = require('../models/notification.model');
const Review = require('../models/review.model');
const { sendNotification } = require('../services/notification.service');
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
      .populate('student_id', 'name email profilePicture')
      .populate('teacher_id', 'name email profilePicture')
      .populate('gig_id', 'title description duration price');

    // Notify the teacher about the new booking
    if (populatedBooking) {
      await sendNotification({
        user_id: populatedBooking.teacher_id._id,
        sender_id: populatedBooking.student_id._id,
        type: 'booking_created',
        title: 'New Session Booked',
        message: `${populatedBooking.student_id.name} booked a session for "${populatedBooking.gig_id?.title}" at ${new Date(populatedBooking.time).toLocaleString()}.`,
        booking_id: populatedBooking._id,
      });
    }

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

      // Prevent manual approval of expired pending bookings
      if (status === 'confirmed' && new Date(booking.time) <= new Date()) {
        throw new Error('BOOKING_EXPIRED_CANNOT_APPROVE');
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
      .populate('student_id', 'name email walletBalance profilePicture')
      .populate('teacher_id', 'name email profilePicture')
      .populate('gig_id', 'title price');

    // Trigger persistent notifications for status transitions
    if (updatedBooking) {
      if (status === 'confirmed') {
        await sendNotification({
          user_id: updatedBooking.student_id._id,
          sender_id: req.user.id,
          type: 'booking_approved',
          title: 'Session Approved',
          message: `Your session for "${updatedBooking.gig_id?.title || 'Specialized Session'}" has been approved by ${updatedBooking.teacher_id.name}! Meeting link: ${updatedBooking.meetingLink || 'standard room'}.`,
          booking_id: updatedBooking._id,
        });
      } else if (status === 'cancelled') {
        const isTeacher = req.user.id === updatedBooking.teacher_id._id.toString();
        const recipientId = isTeacher ? updatedBooking.student_id._id : updatedBooking.teacher_id._id;
        const actorName = isTeacher ? updatedBooking.teacher_id.name : updatedBooking.student_id.name;

        await sendNotification({
          user_id: recipientId,
          sender_id: req.user.id,
          type: 'booking_cancelled',
          title: 'Session Cancelled',
          message: `Your session for "${updatedBooking.gig_id?.title || 'Specialized Session'}" has been cancelled by ${actorName}.`,
          booking_id: updatedBooking._id,
        });
      } else if (status === 'completed') {
        await sendNotification({
          user_id: updatedBooking.student_id._id,
          sender_id: req.user.id,
          type: 'booking_completed',
          title: 'Session Completed',
          message: `Your session "${updatedBooking.gig_id?.title || 'Specialized Session'}" with ${updatedBooking.teacher_id.name} is complete. Please share your rating and review!`,
          booking_id: updatedBooking._id,
        });

        await sendNotification({
          user_id: updatedBooking.teacher_id._id,
          sender_id: req.user.id,
          type: 'booking_completed',
          title: 'Session Completed',
          message: `Your teaching session "${updatedBooking.gig_id?.title || 'Specialized Session'}" with ${updatedBooking.student_id.name} is complete. Payout is pending admin approval.`,
          booking_id: updatedBooking._id,
        });
      }
    }

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
    if (error.message === 'BOOKING_EXPIRED_CANNOT_APPROVE') {
      return res.status(400).json({
        message: 'This session has already expired because the scheduled consultation time has passed. It can no longer be approved.',
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
      .populate('student_id', 'name email profilePicture')
      .populate('teacher_id', 'name email profilePicture')
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

const createReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, reviewText } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.student_id.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Only the student who made the booking can leave a review.',
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        message: 'You can only leave a review for completed sessions.',
      });
    }

    const existingReview = await Review.findOne({ booking_id: id });
    if (existingReview) {
      return res.status(400).json({
        message: 'You have already reviewed this session.',
      });
    }

    const review = await Review.create({
      booking_id: id,
      student_id: req.user.id,
      teacher_id: booking.teacher_id,
      gig_id: booking.gig_id,
      rating,
      reviewText,
    });

    // Update Gig average rating
    const gigReviews = await Review.find({ gig_id: booking.gig_id });
    const avgGigRating =
      gigReviews.reduce((sum, r) => sum + r.rating, 0) / gigReviews.length;
    await Gig.findByIdAndUpdate(booking.gig_id, {
      rating: Number(avgGigRating.toFixed(1)),
    });

    // Update Teacher average rating
    const teacherReviews = await Review.find({ teacher_id: booking.teacher_id });
    const avgTeacherRating =
      teacherReviews.reduce((sum, r) => sum + r.rating, 0) /
      teacherReviews.length;
    await User.findByIdAndUpdate(booking.teacher_id, {
      rating: Number(avgTeacherRating.toFixed(1)),
    });

    // Fetch student's name for the notification
    const studentUser = await User.findById(req.user.id).select('name');

    // Notify the teacher about the new review/rating
    await sendNotification({
      user_id: booking.teacher_id,
      sender_id: req.user.id,
      type: 'rating_received',
      title: 'New Review Received',
      message: `${studentUser.name} left a ${rating} star review for your session.`,
      booking_id: booking._id,
      rating,
    });

    return res.status(201).json({
      message: 'Review submitted successfully.',
      review,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBooking,
  updateBookingStatus,
  getMyBookings,
  getChatHistory,
  createReview,
};
