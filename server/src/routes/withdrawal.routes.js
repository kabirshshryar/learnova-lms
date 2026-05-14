const express = require('express');
const {
  createWithdrawalRequest,
  getMyWithdrawalRequests,
  getPendingWithdrawals,
  reviewWithdrawalRequest,
} = require('../controllers/withdrawal.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', verifyToken, createWithdrawalRequest);
router.get('/me', verifyToken, getMyWithdrawalRequests);
router.get('/pending', verifyToken, getPendingWithdrawals);
router.patch('/:id/review', verifyToken, reviewWithdrawalRequest);

module.exports = router;
