const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
  uploadAndGenerateQuiz,
  getQuizStatus,
  getQuizQuestions,
  submitQuiz,
} = require('../controllers/quizController');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});

// POST /api/quiz/upload : Upload PDF, store in R2, add job to queue
router.post(
  '/upload',
  protect, // 1. Check authentication
  upload.single('pdfFile'), // 2. Handle file upload with multer
  uploadAndGenerateQuiz, // 3. Controller logic
);

// GET /api/quiz/status/:quizSetId : Check the status of quiz generation
router.get('/status/:quizSetId', protect, getQuizStatus);

// GET /api/quiz/:quizSetId : Get generated questions (only if ready)
router.get('/:quizSetId', protect, getQuizQuestions);

// POST /api/quiz/submit/:quizSetId : Submit answers for a quiz
router.post('/submit/:quizSetId', protect, submitQuiz);

module.exports = router;
