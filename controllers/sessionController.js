const QuizSession = require('../models/QuizSession');
const mongoose = require('mongoose');

const getUserSessions = async (req, res) => {
  const userId = req.user.id;

  try {
    const sessions = await QuizSession.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'quizSetId',
        select: 'pdfFileName, createdAt',
      });
    // .skip(0).limit(10); // pagination for later

    if (!sessions) {
      return res.status(200).json({ success: true, sessions: [] });
    }

    const formattedSessions = sessions.map((session) => ({
      sessionId: session._id,
      score: session.score,
      totalQuestions: session.totalQuestions,
      takenAt: session.createdAt,
      quizInfo: session.quizSetId
        ? {
            // Check if populate worked
            quizSetId: session.quizSetId._id,
            pdfFilename: session.quizSetId.pdfFilename,
            quizCreatedAt: session.quizSetId.createdAt,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      count: formattedSessions.length,
      sessions: formattedSessions,
    });
  } catch (error) {
    console.error('API: Error getting user sessions:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to get sessions' });
  }
};

const getSingleSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Session ID' });
    }

    const session = await QuizSession.findOne({
      _id: sessionId,
      userId,
    }).populate({
      path: 'quizSetId',
      select: 'pdfFileName questions pdfUrl createdAt',
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: 'Session not found' });
    }

    console.log('session', session);

    const detailedResult = {
      sessionId: session.id,
      score: session.score,
      totalQuestions: session.totalQuestions,
      takenAt: session.createdAt,
      quizInfo: session.quizSetId
        ? {
            // Check if populate worked
            quizSetId: session.quizSetId.id,
            pdfFileName: session.quizSetId.pdfFileName,
            //   pdfUrl: session.quizSetId.pdfUrl,
            quizCreatedAt: session.quizSetId.createdAt,
          }
        : null,
      questions: session.quizSetId
        ? session.quizSetId.questions.map((q, index) => ({
            questionText: q.questionText,
            options: q.options,
            userAnswerIndex: session.userAnswers[index],
            correctAnswerIndex: q.correctAnswerIndex,
            isCorrect: session.userAnswers[index] === q.correctAnswerIndex,
          }))
        : [],
    };
    console.log('detailedResult', detailedResult);
    return res.status(200).json({
      success: true,
      sessionDeatails: detailedResult,
    });
  } catch (error) {
    console.error('API: Error getting single session details:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to get session details' });
  }
};

module.exports = {
  getUserSessions,
  getSingleSessionDetails,
};
