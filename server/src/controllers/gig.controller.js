const Gig = require('../models/gig.model');
const User = require('../models/user.model');
const Booking = require('../models/booking.model');
const {
  normalizeTags,
  isValidObjectId,
  toPositiveNumber,
} = require('../utils/validation');

const createGig = async (req, res) => {
  try {
    const { title, description, tags, duration, price } = req.body;
    const parsedDuration = toPositiveNumber(duration);
    const parsedPrice = Number(price);

    if (!title || !description || parsedDuration == null || !Number.isFinite(parsedPrice)) {
      return res.status(400).json({
        message:
          'Title, description, valid duration (>0), and valid price are required.',
      });
    }

    const gig = await Gig.create({
      teacher_id: req.user.id,
      title: String(title).trim(),
      description: String(description).trim(),
      tags: normalizeTags(tags),
      duration: parsedDuration,
      price: parsedPrice,
    });

    return res.status(201).json({
      message: 'Gig created successfully.',
      gig,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllGigs = async (req, res) => {
  try {
    const {
      search,
      tags,
      minPrice,
      maxPrice,
      minRating,
      maxRating,
      minDuration,
      maxDuration,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const filters = {};

    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (tags) {
      const parsedTags = String(tags)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      if (parsedTags.length) {
        filters.tags = { $in: parsedTags };
      }
    }

    if (minPrice != null || maxPrice != null) {
      filters.price = {};
      if (minPrice != null) filters.price.$gte = Number(minPrice);
      if (maxPrice != null) filters.price.$lte = Number(maxPrice);
    }

    if (minRating != null || maxRating != null) {
      filters.rating = {};
      if (minRating != null) filters.rating.$gte = Number(minRating);
      if (maxRating != null) filters.rating.$lte = Number(maxRating);
    }

    if (minDuration != null || maxDuration != null) {
      filters.duration = {};
      if (minDuration != null) filters.duration.$gte = Number(minDuration);
      if (maxDuration != null) filters.duration.$lte = Number(maxDuration);
    }

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const allowedSortFields = ['createdAt', 'price', 'rating', 'duration', 'title'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [gigs, total] = await Promise.all([
      Gig.find(filters)
        .sort({ [safeSortBy]: sortDirection })
        .skip(skip)
        .limit(safeLimit)
        .populate('teacher_id', 'name email roles rating')
        .lean(),
      Gig.countDocuments(filters),
    ]);

    return res.status(200).json({
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      gigs,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getGigById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid gig ID.' });
    }

    const gig = await Gig.findById(id).populate(
      'teacher_id',
      'name email roles rating'
    );

    if (!gig) {
      return res.status(404).json({ message: 'Gig not found.' });
    }

    return res.status(200).json({ gig });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteGig = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid gig ID.' });
    }

    const gig = await Gig.findById(id);

    if (!gig) {
      return res.status(404).json({ message: 'Gig not found.' });
    }

    if (gig.teacher_id.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Access denied. Only the owner teacher can delete this gig.',
      });
    }

    await gig.deleteOne();

    return res.status(200).json({
      message: 'Gig deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getRecommendedGigs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('interests').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const interests = normalizeTags(user.interests || []);
    const recentBookings = await Booking.find({ student_id: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('gig_id', 'tags')
      .lean();

    const bookedTags = normalizeTags(
      recentBookings.flatMap((booking) => booking.gig_id?.tags || [])
    );

    const allSignals = [...new Set([...interests, ...bookedTags])];
    const matchFilter = allSignals.length ? { tags: { $in: allSignals } } : {};

    const candidateGigs = await Gig.find(matchFilter)
      .sort({ rating: -1, createdAt: -1 })
      .limit(60)
      .populate('teacher_id', 'name email rating')
      .lean();

    const scored = candidateGigs
      .map((gig) => {
        const gigTags = normalizeTags(gig.tags || []);
        const interestScore = gigTags.filter((tag) => interests.includes(tag)).length * 3;
        const historyScore = gigTags.filter((tag) => bookedTags.includes(tag)).length * 2;
        const ratingScore = Number(gig.rating || 0);
        const pricePenalty = Number(gig.price || 0) / 100;
        const score = interestScore + historyScore + ratingScore - pricePenalty;
        return { ...gig, recommendationScore: Number(score.toFixed(3)) };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 12);

    return res.status(200).json({
      interests,
      recommendationSignals: {
        interests,
        bookedTags,
      },
      gigs: scored,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createGig,
  getAllGigs,
  getGigById,
  deleteGig,
  getRecommendedGigs,
};
