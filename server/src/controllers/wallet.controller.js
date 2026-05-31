const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');
const TokenPurchase = require('../models/token-purchase.model');

const PACKAGES = {
  50: 10,
  100: 20,
  200: 50,
  500: 150
};

const getMyTransactions = async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit) || 50;
    const limit = Math.min(Math.max(limitRaw, 1), 100);

    const transactions = await Transaction.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ transactions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const topUpWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const parsedAmount = Number(amount);

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        message: 'Amount must be a positive integer.',
      });
    }

    const user = await User.findById(req.user.id).select('walletBalance');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const currentBalance = User.walletAmount(user);
    user.walletBalance = currentBalance + parsedAmount;
    await user.save();
    await Transaction.create({
      user_id: req.user.id,
      operation: 'topup',
      amount: parsedAmount,
      balanceBefore: currentBalance,
      balanceAfter: user.walletBalance,
      referenceType: 'wallet_topup',
      description: 'Mock wallet top-up.',
    });

    return res.status(200).json({
      message: 'Wallet top-up successful (mock payment).',
      walletBalance: user.walletBalance,
      addedTokens: parsedAmount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createManualPurchase = async (req, res) => {
  try {
    const { bkashNumber, amountPaid, trxId } = req.body;

    if (!bkashNumber || amountPaid === undefined || !trxId) {
      return res.status(400).json({ message: 'bKash number, amount paid, and trxId are required.' });
    }

    const parsedAmount = Number(amountPaid);
    if (!PACKAGES[parsedAmount]) {
      return res.status(400).json({
        message: `Invalid package amount. Valid amounts are BDT 50, 100, 200, or 500.`,
      });
    }

    const tokens = PACKAGES[parsedAmount];

    // Check if trxId already exists
    const existing = await TokenPurchase.findOne({ trxId: trxId.trim() });
    if (existing) {
      return res.status(400).json({ message: 'This transaction ID (trxId) has already been submitted.' });
    }

    const purchase = await TokenPurchase.create({
      user_id: req.user.id,
      bkashNumber: bkashNumber.trim(),
      amountPaid: parsedAmount,
      tokens: tokens,
      trxId: trxId.trim(),
      status: 'pending',
    });

    return res.status(201).json({
      message: 'Your token purchase request has been submitted successfully. Waiting for admin approval.',
      purchase,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyManualPurchases = async (req, res) => {
  try {
    const purchases = await TokenPurchase.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ purchases });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  topUpWallet,
  getMyTransactions,
  createManualPurchase,
  getMyManualPurchases,
};

