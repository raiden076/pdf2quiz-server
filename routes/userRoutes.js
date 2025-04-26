const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getUSerProfile } = require('../controllers/userController');

const router = express.Router();

router.get('/me', protect, getUSerProfile);

module.exports = router;
