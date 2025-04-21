const mongoose = require("mongoose");

// structure of individual questions
const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: [true, "Question text is required"],
        trim: true
    },
    options: {
        type: [String],
        required: [true, "Options are required"],
        trim: true,
        validate: [arr => arr.length >= 1, "At least 2 options are required"]
    },
    correctAnswerIndex: {
        type: Number,
        required: [true, "Correct answer index is required"],
        min: 0
    }
}, { _id: false });

// a quiz set comprised of multiple questions created by a user from a pdf file
const quizSetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "User ID is required"],
        ref: "User",
        index: true
    },
    pdfFileName: {
        type: String,
        required: [true, "PDF file name is required"],
        trim: true
    },
    pdfUrl: {
        type: String,
        required: [true, "PDF URL is required"],
    },
    questions: {
        type: [questionSchema],
        required: [true, "Questions are required"],
        validate: [arr => arr.length >= 1, "At least 1 question is required"]
    },
    // not sure this will be needed in the mvp, but let's keep it for now
    status: {
        type: String,
        required: true,
        enum: ['processing', 'ready', 'error'],
        default: 'processing',
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// create and export quizset model
const QuizSet = mongoose.model("QuizSet", quizSetSchema);
module.exports = QuizSet;