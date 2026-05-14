const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        message: 'JWT_SECRET is missing in environment variables.',
      });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired token.',
    });
  }
};

const requireTeacherRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('roles');

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const isTeacher = roles.includes('instructor') || roles.includes('admin');

    if (!isTeacher) {
      return res.status(403).json({
        message: 'Access denied. Teacher role is required.',
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const requireStudentRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('roles');

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const isStudent = roles.includes('student') || roles.includes('admin');

    if (!isStudent) {
      return res.status(403).json({
        message: 'Access denied. Student role is required.',
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  verifyToken,
  requireTeacherRole,
  requireStudentRole,
};
