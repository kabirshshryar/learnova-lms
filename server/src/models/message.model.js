const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ booking_id: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
