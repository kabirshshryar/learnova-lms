// server/src/services/weekly-token.service.js
const cron = require('node-cron');
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');

/** Grant 50 tokens to every active user – runs every Monday at 00:00 UTC */
const grantWeeklyTokens = async () => {
  try {
    const users = await User.find({ status: 'active' });
    const amount = 50;

    for (const user of users) {
      const balanceBefore = user.walletBalance;
      user.walletBalance += amount;
      await user.save();

      await Transaction.create({
        user_id: user._id,
        operation: 'topup',
        amount: amount,
        balanceBefore,
        balanceAfter: user.walletBalance,
        referenceType: 'other',
        description: 'Weekly 50 token grant.',
      });
    }
    console.log(`Weekly token grant: ${users.length} users received ${amount} tokens.`);
  } catch (e) {
    console.error('Weekly token grant failed:', e);
  }
};

// Schedule: 0 0 * * 1 (Every Monday at midnight)
cron.schedule('0 0 * * 1', () => {
  console.log('Running weekly token grant job...');
  grantWeeklyTokens();
});

module.exports = { grantWeeklyTokens };
