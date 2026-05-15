const mongoose = require('mongoose');
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');
const WithdrawalRequest = require('../models/withdrawal-request.model');

const createWithdrawalRequest = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { amount, note } = req.body;
    const parsedAmount = Number(amount);

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        message: 'Amount must be a positive integer.',
      });
    }

    let requestDoc;

    await session.withTransaction(async () => {
      const teacher = await User.findById(req.user.id)
        .select('roles withdrawableBalance status')
        .session(session);

      if (!teacher) {
        throw new Error('USER_NOT_FOUND');
      }

      if (teacher.status !== 'active') {
        throw new Error('ACCOUNT_NOT_APPROVED');
      }

      const roles = Array.isArray(teacher.roles) ? teacher.roles : [];
      const isTeacher = roles.includes('instructor') || roles.includes('admin');
      if (!isTeacher) {
        throw new Error('TEACHER_ROLE_REQUIRED');
      }

      const withdrawableBefore = User.withdrawableAmount(teacher);
      if (withdrawableBefore < parsedAmount) {
        throw new Error('INSUFFICIENT_WITHDRAWABLE_BALANCE');
      }

      const existingPending = await WithdrawalRequest.findOne({
        teacher_id: req.user.id,
        status: 'pending',
      }).session(session);

      if (existingPending) {
        throw new Error('PENDING_REQUEST_EXISTS');
      }

      teacher.withdrawableBalance = withdrawableBefore - parsedAmount;
      await teacher.save({ session });

      const created = await WithdrawalRequest.create(
        [
          {
            teacher_id: req.user.id,
            amount: parsedAmount,
            note: typeof note === 'string' ? note : '',
            status: 'pending',
          },
        ],
        { session }
      );

      requestDoc = created[0];

      await Transaction.create(
        [
          {
            user_id: req.user.id,
            operation: 'debit',
            amount: parsedAmount,
            balanceBefore: withdrawableBefore,
            balanceAfter: teacher.withdrawableBalance,
            referenceType: 'other',
            referenceId: requestDoc._id,
            description:
              'Tokens reserved from withdrawable balance for withdrawal request.',
          },
        ],
        { session }
      );
    });

    return res.status(201).json({
      message: 'Withdrawal request submitted successfully.',
      request: requestDoc,
    });
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (error.message === 'TEACHER_ROLE_REQUIRED') {
      return res.status(403).json({
        message: 'Access denied. Teacher role is required.',
      });
    }
    if (error.message === 'ACCOUNT_NOT_APPROVED') {
      return res.status(403).json({
        message: 'Your account must be approved by an admin before you can request withdrawals.',
      });
    }
    if (error.message === 'INSUFFICIENT_WITHDRAWABLE_BALANCE') {
      return res.status(400).json({
        message: 'Insufficient withdrawable balance.',
      });
    }
    if (error.message === 'PENDING_REQUEST_EXISTS') {
      return res.status(409).json({
        message: 'You already have a pending withdrawal request.',
      });
    }
    return res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

const getMyWithdrawalRequests = async (req, res) => {
  try {
    const requests = await WithdrawalRequest.find({ teacher_id: req.user.id })
      .sort({ createdAt: -1 })
      .populate('processedBy', 'name email');

    return res.status(200).json({ requests });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPendingWithdrawals = async (req, res) => {
  try {
    const reviewer = await User.findById(req.user.id).select('roles');
    if (!reviewer) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const roles = Array.isArray(reviewer.roles) ? reviewer.roles : [];
    if (!roles.includes('admin')) {
      return res.status(403).json({
        message: 'Access denied. Admin role is required.',
      });
    }

    const requests = await WithdrawalRequest.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .populate('teacher_id', 'name email');

    return res.status(200).json({ requests });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const reviewWithdrawalRequest = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid withdrawal request ID.' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: 'Status must be either approved or rejected.',
      });
    }

    let updatedRequest;

    await session.withTransaction(async () => {
      const reviewer = await User.findById(req.user.id).select('roles').session(session);
      if (!reviewer) {
        throw new Error('REVIEWER_NOT_FOUND');
      }

      const roles = Array.isArray(reviewer.roles) ? reviewer.roles : [];
      if (!roles.includes('admin')) {
        throw new Error('ADMIN_ROLE_REQUIRED');
      }

      const requestDoc = await WithdrawalRequest.findById(id).session(session);
      if (!requestDoc) {
        throw new Error('REQUEST_NOT_FOUND');
      }

      if (requestDoc.status !== 'pending') {
        throw new Error('REQUEST_ALREADY_PROCESSED');
      }

      requestDoc.status = status;
      requestDoc.processedBy = req.user.id;
      requestDoc.processedAt = new Date();
      await requestDoc.save({ session });

      if (status === 'rejected') {
        const teacher = await User.findById(requestDoc.teacher_id)
          .select('withdrawableBalance')
          .session(session);

        if (!teacher) {
          throw new Error('TEACHER_NOT_FOUND');
        }

        const balanceBefore = User.withdrawableAmount(teacher);
        teacher.withdrawableBalance = balanceBefore + requestDoc.amount;
        await teacher.save({ session });

        await Transaction.create(
          [
            {
              user_id: requestDoc.teacher_id,
              operation: 'refund',
              amount: requestDoc.amount,
              balanceBefore,
              balanceAfter: teacher.withdrawableBalance,
              referenceType: 'other',
              referenceId: requestDoc._id,
              description:
                'Withdrawal request rejected; tokens returned to withdrawable balance.',
            },
          ],
          { session }
        );
      }

      updatedRequest = requestDoc;
    });

    return res.status(200).json({
      message: `Withdrawal request ${status}.`,
      request: updatedRequest,
    });
  } catch (error) {
    if (error.message === 'REVIEWER_NOT_FOUND') {
      return res.status(404).json({ message: 'Reviewer not found.' });
    }
    if (error.message === 'ADMIN_ROLE_REQUIRED') {
      return res.status(403).json({
        message: 'Access denied. Admin role is required.',
      });
    }
    if (error.message === 'REQUEST_NOT_FOUND') {
      return res.status(404).json({ message: 'Withdrawal request not found.' });
    }
    if (error.message === 'REQUEST_ALREADY_PROCESSED') {
      return res.status(409).json({
        message: 'Withdrawal request is already processed.',
      });
    }
    if (error.message === 'TEACHER_NOT_FOUND') {
      return res.status(404).json({ message: 'Teacher not found.' });
    }
    return res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createWithdrawalRequest,
  getMyWithdrawalRequests,
  getPendingWithdrawals,
  reviewWithdrawalRequest,
};
