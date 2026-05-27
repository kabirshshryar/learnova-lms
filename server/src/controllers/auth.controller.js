const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is missing in environment variables.');
  }

  return jwt.sign({ id: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const register = async (req, res) => {
  try {
    const { name, email, password, interests } = req.body;
    /** If true: same account can learn AND offer paid topic sessions (Fiverr-like dual hat). */
    const wantToTeach = Boolean(req.body.wantToTeach);

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already in use.' });
    }

    const roles = wantToTeach ? ['student', 'instructor'] : ['student'];

    const user = await User.create({
      name,
      email,
      password,
      roles,
      interests: Array.isArray(interests)
        ? interests.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
        : [],
      walletBalance: 0,
    });

    user.isOnline = true;
    await user.save();

    const token = generateToken(user._id);

    return res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        interests: Array.isArray(user.interests) ? user.interests : [],
        walletBalance: User.walletAmount(user),
        withdrawableBalance: User.withdrawableAmount(user),
        rating: user.rating,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'restricted') {
      return res.status(403).json({ message: 'Your account has been restricted. Please contact support.' });
    }
    if (user.status === 'deleted') {
      return res.status(403).json({ message: 'This account no longer exists.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    user.isOnline = true;
    await user.save();

    const token = generateToken(user._id);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        interests: Array.isArray(user.interests) ? user.interests : [],
        walletBalance: User.walletAmount(user),
        withdrawableBalance: User.withdrawableAmount(user),
        rating: user.rating,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.isOnline) {
      user.isOnline = true;
      await user.save();
    }

    const payload = user.toObject();
    payload.id = user._id;
    payload.walletBalance = User.walletAmount(user);
    payload.withdrawableBalance = User.withdrawableAmount(user);
    payload.interests = Array.isArray(user.interests) ? user.interests : [];

    return res.status(200).json({ user: payload });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const becomeInstructor = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const current = Array.isArray(user.roles) ? user.roles : [];
    if (current.includes('instructor')) {
      return res.status(200).json({
        message: 'Your account already has instructor access.',
        roles: user.roles,
      });
    }

    user.roles = [...current, 'instructor'];
    await user.save();

    return res.status(200).json({
      message:
        'Instructor profile enabled. You can publish topic sessions and earn tokens.',
      roles: user.roles,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateMyInterests = async (req, res) => {
  try {
    const { interests } = req.body;
    if (!Array.isArray(interests)) {
      return res
        .status(400)
        .json({ message: 'interests must be an array of strings.' });
    }

    const normalized = [
      ...new Set(
        interests
          .map((tag) => String(tag).trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 20)
      ),
    ];

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.interests = normalized;
    await user.save();

    return res.status(200).json({
      message: 'Interests updated successfully.',
      interests: user.interests,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, description, education, certification, experience, interests } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (name !== undefined) user.name = name.trim();
    if (description !== undefined) user.description = description.trim();
    if (education !== undefined) user.education = education.trim();
    if (certification !== undefined) user.certification = certification.trim();
    if (experience !== undefined) user.experience = experience.trim();

    if (interests !== undefined && Array.isArray(interests)) {
      user.interests = [
        ...new Set(
          interests
            .map((tag) => String(tag).trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 20)
        ),
      ];
    }

    await user.save();

    const payload = user.toObject();
    payload.id = user._id;
    payload.walletBalance = User.walletAmount(user);
    payload.withdrawableBalance = User.withdrawableAmount(user);
    delete payload.password;

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: payload,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  becomeInstructor,
  updateMyInterests,
  updateProfile,
};
