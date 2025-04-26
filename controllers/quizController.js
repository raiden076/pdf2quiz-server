const QuizSet = require('../models/QuizSet');
const QuizSession = require('../models/QuizSession');
const { uploadToR2 } = require('../utils/r2Utils');
const mongoose = require('mongoose');
const { quizGeneratorQueue } = require('../queues/quizQueue');

const uploadAndGenerateQuiz = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: 'No file uploaded' });
  }

  if (!req.file.mimetype.startsWith('application/pdf')) {
    return res
      .status(400)
      .json({ success: false, message: 'File must be a PDF' });
  }

  console.log(`recieved pdf ${req.file.originalname} for user ${req.user.id}`);

  const pdfBuffer = req.file.buffer;
  const originalFileName = req.file.originalname;
  const mimeType = req.file.mimetype;
  const userId = req.user.id;

  let savedQuizSet = null;

  try {
    // upload file to R2
    const { fileLocation: pdfUrl, fileKey: r2ObjectKey } = await uploadToR2(
      pdfBuffer,
      originalFileName,
      mimeType,
      userId,
    );
    console.log(`PDF uploaded to R2: ${pdfUrl}`);

    // create a new quiz set
    const newQuizSet = new QuizSet({
      _id: new mongoose.Types.ObjectId(),
      userId: userId,
      pdfUrl: pdfUrl,
      r2ObjectKey: r2ObjectKey,
      pdfFileName: originalFileName,
      status: 'processing',
    });
    savedQuizSet = await newQuizSet.save();
    const quizSetId = savedQuizSet.id;
    console.log(
      `API: Initial QuizSet saved. ID: ${quizSetId}, Status: processing`,
    );

    const jobData = {
      quizSetId,
      userId,
      pdfUrl,
      r2ObjectKey,
      originalFileName,
    };

    // add the job to bullqueue with quizsetId as the job id
    await quizGeneratorQueue.add('generateQuizFromPdf', jobData, {
      jobId: quizSetId,
    });
    console.log(
      `API: Job added to queue '${quizGeneratorQueue.name}' for QuizSet ID: ${quizSetId}`,
    );

    return res.status(202).json({
      success: true,
      message: 'Quiz generation process accepted and queued.',
      quizSetId,
    });
  } catch (error) {
    console.error('API: Error in upload or queuing process:', error);
    // attempt to update DBStatus to error if job failed critically
    if (savedQuizSet?.id) {
      try {
        await QuizSet.findByIdAndUpdate(savedQuizSet.id, {
          status: 'error',
          errorMessage: error.message,
        });
      } catch (dbError) {
        console.error('API: Error updating DB status:', dbError);
      }
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

const getQuizStatus = async (req, res) => {
  const { quizSetId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(quizSetId)) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid QuizSet ID' });
  }

  try {
    const quizSet = await QuizSet.findOne({
      _id: quizSetId,
      userId: req.user.id,
    });
    if (!quizSet) {
      return res
        .status(404)
        .json({ success: false, message: 'QuizSet not found' });
    }

    return res.status(200).json({
      success: true,
      status: quizSet.status,
      quizSetId,
      errorMessage: quizSet.status === 'error' && quizSet.errorMessage,
      questionCount: quizSet.status === 'ready' ? quizSet.questions.length : 0,
    });
  } catch (error) {
    console.error('API: Error getting QuizSet status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

const getQuizQuestions = async (req, res) => {
  const { quizSetId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(quizSetId)) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid QuizSet ID' });
  }

  try {
    const quizSet = await QuizSet.findOne({
      _id: quizSetId,
      userId: req.user.id,
    });
    if (!quizSet) {
      return res
        .status(404)
        .json({ success: false, message: 'QuizSet not found' });
    }

    if (quizSet.status !== 'ready') {
      return res
        .status(400)
        .json({ success: false, message: 'QuizSet not ready' });
    }

    const questionsForClient = quizSet.questions.map((q) => ({
      questionText: q.questionText,
      options: q.options,
    }));

    return res.status(200).json({
      success: true,
      questions: questionsForClient,
      quizSetId,
      pdfFileName: quizSet.pdfFileName,
    });
  } catch (error) {
    console.error('API: Error getting QuizSet questions:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

const submitQuiz = async (req, res) => {
  const { quizSetId } = req.params;
  const { userAnswers } = req.body;

  if (!mongoose.Types.ObjectId.isValid(quizSetId)) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid QuizSet ID' });
  }
  if (!userAnswers || !Array.isArray(userAnswers)) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid or missing answers array.' });
  }

  try {
    const quizSet = await QuizSet.findOne({
      _id: quizSetId,
      userId: req.user.id,
    });
    if (!quizSet) {
      return res
        .status(404)
        .json({ success: false, message: 'QuizSet not found.' });
    }

    if (quizSet.status !== 'ready') {
      return res
        .status(400)
        .json({ success: false, message: 'QuizSet not ready.' });
    }

    const correctAnswers = quizSet.questions.map((q) => q.correctAnswerIndex);
    const totalQuestions = correctAnswers.length;

    if (userAnswers.length !== totalQuestions) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid number of answers.' });
    }

    let score = 0;
    const results = quizSet.questions.map((q, index) => {
      const userAnswer = userAnswers[index];
      const isCorrect = userAnswer === correctAnswers[index];
      if (isCorrect) {
        score++;
      }
      return {
        questionText: q.questionText,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        userAnswer,
        isCorrect,
      };
    });

    const quizSession = new QuizSession({
      userId: req.user.id,
      quizSetId,
      userAnswers,
      score,
      totalQuestions,
    });

    const savedSession = await quizSession.save();
    return res.status(200).json({
      success: true,
      results,
      score,
      totalQuestions,
      quizSessionId: savedSession._id,
    });
  } catch (error) {
    console.error('API: Error submitting quiz:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Evaluation Failed; Internal Server Error',
    });
  }
};

module.exports = {
  uploadAndGenerateQuiz,
  getQuizStatus,
  getQuizQuestions,
  submitQuiz,
};
