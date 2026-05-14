const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');

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

module.exports = {
  topUpWallet,
  getMyTransactions,
};
