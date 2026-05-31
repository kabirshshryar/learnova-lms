const express = require('express');
const {
  topUpWallet,
  getMyTransactions,
  createManualPurchase,
  getMyManualPurchases,
} = require('../controllers/wallet.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/transactions', verifyToken, getMyTransactions);
router.post('/topup', verifyToken, topUpWallet);
router.post('/manual-purchase', verifyToken, createManualPurchase);
router.get('/manual-purchases', verifyToken, getMyManualPurchases);

module.exports = router;

