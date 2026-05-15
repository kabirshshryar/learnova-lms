// server/src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');
const { listPendingUsers, approveUser, listPendingBookings, approveBooking } = require('../controllers/admin.controller');

router.use(verifyToken, adminMiddleware.requireAdmin);

// Users
router.get('/users/pending', listPendingUsers);
router.post('/users/:id/approve', approveUser);

// Bookings
router.get('/bookings/pending', listPendingBookings);
router.post('/bookings/:id/approve', approveBooking);

module.exports = router;
