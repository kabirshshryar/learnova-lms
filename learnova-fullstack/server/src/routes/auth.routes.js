const express = require('express');
const {
  register,
  login,
  getMe,
  becomeInstructor,
  updateMyInterests,
} = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.patch('/me/become-instructor', verifyToken, becomeInstructor);
router.patch('/me/interests', verifyToken, updateMyInterests);

module.exports = router;
