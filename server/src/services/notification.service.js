const cron = require('node-cron');
const Booking = require('../models/booking.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { getIO } = require('../utils/socket');

/**
 * Creates a notification in the database and broadcasts it in real-time via Socket.io
 */
const sendNotification = async ({ user_id, sender_id, type, title, message, booking_id, rating }) => {
  try {
    const notification = await Notification.create({
      user_id,
      sender_id,
      type,
      title,
      message,
      booking_id,
      rating,
    });

    const populated = await Notification.findById(notification._id)
      .populate('sender_id', 'name email roles')
      .populate({
        path: 'booking_id',
        populate: { path: 'gig_id', select: 'title' },
      });

    const io = getIO();
    if (io) {
      io.to(`user:${user_id.toString()}`).emit('notification:new', populated);
    }
    return populated;
  } catch (err) {
    console.error('Error in sendNotification helper:', err);
  }
};

/**
 * Periodically runs every minute to:
 * 1. Find confirmed bookings starting in ~5 minutes (between 4 and 6 minutes from now) and send reminders.
 * 2. Find confirmed bookings where end time (start time + gig duration) is in the past, transition to completed, and trigger "time over" notifications.
 */
const checkSessions = async () => {
  try {
    const now = new Date();

    // --- 1. 5-Minute Meeting Reminder ---
    const fiveMinsFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    const startRange = new Date(fiveMinsFromNow.getTime() - 60 * 1000); // 4 minutes
    const endRange = new Date(fiveMinsFromNow.getTime() + 60 * 1000);   // 6 minutes

    const upcomingBookings = await Booking.find({
      status: 'confirmed',
      time: { $gte: startRange, $lte: endRange },
      reminderSent: { $ne: true },
    })
      .populate('student_id', 'name')
      .populate('teacher_id', 'name')
      .populate('gig_id', 'title');

    for (const booking of upcomingBookings) {
      // Send reminder to student
      await sendNotification({
        user_id: booking.student_id._id,
        type: 'booking_reminder',
        title: 'Meeting Starts in 5 Mins',
        message: `Reminder: Your session "${booking.gig_id?.title || 'Specialized Session'}" with ${booking.teacher_id?.name || 'tutor'} starts in 5 minutes. Get ready!`,
        booking_id: booking._id,
      });

      // Send reminder to teacher
      await sendNotification({
        user_id: booking.teacher_id._id,
        type: 'booking_reminder',
        title: 'Session Starts in 5 Mins',
        message: `Reminder: Your teaching session "${booking.gig_id?.title || 'Specialized Session'}" with student ${booking.student_id?.name || 'learner'} starts in 5 minutes.`,
        booking_id: booking._id,
      });

      booking.reminderSent = true;
      await booking.save();
    }

    // --- 2. Time Over / Auto-completion Checker ---
    const activeBookings = await Booking.find({ status: 'confirmed' })
      .populate('gig_id', 'title duration')
      .populate('student_id', 'name')
      .populate('teacher_id', 'name');

    for (const booking of activeBookings) {
      const durationMins = booking.gig_id?.duration || 60;
      const endTime = new Date(booking.time.getTime() + durationMins * 60 * 1000);

      if (endTime <= now) {
        booking.status = 'completed';
        await booking.save();

        // Notify student that session has ended (time over) and they should rate
        await sendNotification({
          user_id: booking.student_id._id,
          type: 'booking_completed',
          title: 'Session Completed',
          message: `Your session "${booking.gig_id?.title || 'Specialized Session'}" has finished. Time is over! Please rate and review your experience.`,
          booking_id: booking._id,
        });

        // Notify teacher that session is completed
        await sendNotification({
          user_id: booking.teacher_id._id,
          type: 'booking_completed',
          title: 'Session Completed',
          message: `Your teaching session "${booking.gig_id?.title || 'Specialized Session'}" has ended. A payout will be processed shortly.`,
          booking_id: booking._id,
        });

        console.log(`Booking ${booking._id} auto-completed due to time over.`);
      }
    }

    // --- 3. Unapproved Pending Expired Booking Cancellations ---
    const expiredPendingBookings = await Booking.find({
      status: 'pending',
      time: { $lte: now }
    })
      .populate('student_id', 'name walletBalance')
      .populate('teacher_id', 'name')
      .populate('gig_id', 'title price');

    for (const booking of expiredPendingBookings) {
      try {
        const student = await User.findById(booking.student_id._id);
        if (student) {
          const balanceBefore = student.walletBalance || 0;
          student.walletBalance = balanceBefore + booking.escrowAmount;
          await student.save();

          // Create refund transaction
          const Transaction = require('../models/transaction.model');
          await Transaction.create({
            user_id: booking.student_id._id,
            operation: 'refund',
            amount: booking.escrowAmount,
            balanceBefore,
            balanceAfter: student.walletBalance,
            referenceType: 'booking',
            referenceId: booking._id,
            description: 'Escrow refunded automatically after tutor failed to approve before consultation time.',
          });
        }

        booking.status = 'cancelled';
        booking.escrowStatus = 'refunded';
        await booking.save();

        // Notify student
        await sendNotification({
          user_id: booking.student_id._id,
          type: 'booking_cancelled',
          title: 'Booking Cancelled Automatically',
          message: `Your booking for "${booking.gig_id?.title || 'Specialized Session'}" was automatically cancelled and refunded because the tutor failed to approve it before the scheduled consultation time.`,
          booking_id: booking._id,
        });

        // Notify teacher
        await sendNotification({
          user_id: booking.teacher_id._id,
          type: 'booking_cancelled',
          title: 'Booking Expired & Cancelled',
          message: `Your booking for "${booking.gig_id?.title || 'Specialized Session'}" with student ${booking.student_id?.name || 'learner'} has expired and was cancelled automatically because it was not approved in time.`,
          booking_id: booking._id,
        });

        console.log(`Booking ${booking._id} expired and was automatically cancelled/refunded.`);
      } catch (err) {
        console.error(`Error auto-cancelling expired pending booking ${booking._id}:`, err);
      }
    }
  } catch (err) {
    console.error('Session checker service error:', err);
  }
};

// Check every minute
cron.schedule('* * * * *', () => {
  console.log('Running session checker job...');
  checkSessions();
});

module.exports = {
  sendNotification,
  checkSessions,
};
