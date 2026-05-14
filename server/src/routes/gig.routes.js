const express = require('express');
const {
  createGig,
  getAllGigs,
  getGigById,
  deleteGig,
  getRecommendedGigs,
} = require('../controllers/gig.controller');
const {
  verifyToken,
  requireTeacherRole,
} = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', getAllGigs);
router.get('/recommended', verifyToken, getRecommendedGigs);
router.get('/:id', getGigById);
router.post('/', verifyToken, requireTeacherRole, createGig);
router.delete('/:id', verifyToken, requireTeacherRole, deleteGig);

module.exports = router;
