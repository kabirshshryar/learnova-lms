// server/src/middlewares/admin.middleware.js
const User = require('../models/user.model');

const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('roles');
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const roles = Array.isArray(user.roles) ? user.roles : [];
    if (!roles.includes('admin')) {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { requireAdmin };
