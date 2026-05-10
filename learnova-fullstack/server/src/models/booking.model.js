const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher ID is required'],
    },
    gig_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: [true, 'Gig ID is required'],
    },
    time: {
      type: Date,
      required: [true, 'Booking time is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    escrowAmount: {
      type: Number,
      default: 0,
      min: [0, 'Escrow amount cannot be negative'],
    },
    escrowStatus: {
      type: String,
      enum: ['none', 'held', 'released', 'refunded'],
      default: 'none',
    },
    meetingRoom: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ student_id: 1, createdAt: -1 });
bookingSchema.index({ teacher_id: 1, createdAt: -1 });
bookingSchema.index({ gig_id: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
