const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    operation: {
      type: String,
      enum: ['topup', 'debit', 'refund', 'adjustment'],
      required: [true, 'Operation is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least 1 token'],
    },
    balanceBefore: {
      type: Number,
      required: [true, 'balanceBefore is required'],
      min: [0, 'balanceBefore cannot be negative'],
    },
    balanceAfter: {
      type: Number,
      required: [true, 'balanceAfter is required'],
      min: [0, 'balanceAfter cannot be negative'],
    },
    referenceType: {
      type: String,
      enum: ['wallet_topup', 'booking', 'admin_adjustment', 'other'],
      default: 'other',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ user_id: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
