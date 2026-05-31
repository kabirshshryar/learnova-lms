const mongoose = require('mongoose');

const tokenPurchaseSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    bkashNumber: {
      type: String,
      required: [true, 'bKash number is required'],
      trim: true,
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [1, 'Amount must be a positive number'],
    },
    tokens: {
      type: Number,
      required: [true, 'Tokens amount is required'],
      min: [1, 'Tokens must be at least 1'],
    },
    trxId: {
      type: String,
      required: [true, 'Transaction ID (trxID) is required'],
      unique: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

tokenPurchaseSchema.index({ user_id: 1, createdAt: -1 });

const TokenPurchase = mongoose.model('TokenPurchase', tokenPurchaseSchema);

module.exports = TokenPurchase;
