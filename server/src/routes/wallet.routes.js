const express = require('express');
const { topUpWallet, getMyTransactions } = require('../controllers/wallet.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/transactions', verifyToken, getMyTransactions);
router.post('/topup', verifyToken, topUpWallet);

module.exports = router;
