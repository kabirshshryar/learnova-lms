const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Booking = require('../models/booking.model');

let ioInstance = null;

const isBookingParticipant = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId).select('student_id teacher_id');
  if (!booking) {
    return false;
  }
  return (
    booking.student_id.toString() === userId.toString() ||
    booking.teacher_id.toString() === userId.toString()
  );
};

const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  ioInstance.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication error: token missing.'));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('Server misconfigured: JWT secret missing.'));
      }

      const decoded = jwt.verify(token, secret);
      socket.user = { id: decoded.id };
      return next();
    } catch (error) {
      return next(new Error('Authentication error.'));
    }
  });

  ioInstance.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on('chat:join_booking', async ({ bookingId }) => {
      if (!bookingId) {
        return;
      }

      const allowed = await isBookingParticipant(bookingId, socket.user.id);
      if (!allowed) {
        socket.emit('chat:error', { message: 'Access denied for this booking.' });
        return;
      }
      socket.join(`booking:${bookingId}`);
    });

    socket.on('chat:message', async ({ bookingId, text }) => {
      if (!bookingId || typeof text !== 'string' || !text.trim()) {
        return;
      }

      const allowed = await isBookingParticipant(bookingId, socket.user.id);
      if (!allowed) {
        socket.emit('chat:error', { message: 'Access denied for this booking.' });
        return;
      }

      try {
        const Message = require('../models/message.model');
        const newMessage = await Message.create({
          booking_id: bookingId,
          sender_id: socket.user.id,
          text: text.trim(),
        });

        ioInstance.to(`booking:${bookingId}`).emit('chat:new_message', {
          _id: newMessage._id,
          bookingId: newMessage.booking_id,
          senderId: newMessage.sender_id,
          text: newMessage.text,
          createdAt: newMessage.createdAt,
        });
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('chat:error', { message: 'Failed to send message.' });
      }
    });
  });

  return ioInstance;
};

const getIO = () => ioInstance;

module.exports = {
  initSocket,
  getIO,
};
