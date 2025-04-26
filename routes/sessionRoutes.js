const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getSingleSessionDetails,
  getUserSessions,
} = require('../controllers/sessionController');

const router = express.Router();

router.get('/', protect, getUserSessions);
router.get('/:sessionId', protect, getSingleSessionDetails);

module.exports = router;
