const mongoose = require('mongoose');

// all the info of a single quiz session
const quizSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'User ID is required'],
    ref: 'User',
    index: true,
  },
  quizSetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Quiz Set ID is required'],
    ref: 'QuizSet',
    index: true,
  },
  userAnswers: {
    type: [Number],
    required: [true, 'User answers are required'],
  },
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: 0,
  },
  totalQuestions: {
    type: Number,
    required: [true, 'Total questions are required'],
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    select: false,
  },
});

const QuizSession = mongoose.model('QuizSession', quizSessionSchema);
module.exports = QuizSession;
