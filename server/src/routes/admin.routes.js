const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');
const { 
  listPendingUsers, 
  approveUser, 
  listAllUsers,
  updateUserStatus,
  listCompletedBookings,
  approvePayout,
  listAllReviews,
  listTokenPurchases,
  approveTokenPurchase,
  rejectTokenPurchase
} = require('../controllers/admin.controller');

router.use(verifyToken, adminMiddleware.requireAdmin);

// Users
router.get('/users', listAllUsers);
router.get('/users/pending', listPendingUsers);
router.post('/users/:id/approve', approveUser);
router.patch('/users/:id/status', updateUserStatus);

// Bookings
router.get('/bookings/completed', listCompletedBookings);
router.post('/bookings/:id/payout', approvePayout);

// Token Purchases (manual bkash)
router.get('/token-purchases', listTokenPurchases);
router.post('/token-purchases/:id/approve', approveTokenPurchase);
router.post('/token-purchases/:id/reject', rejectTokenPurchase);

// Reviews & Ratings
router.get('/reviews', listAllReviews);

module.exports = router;

