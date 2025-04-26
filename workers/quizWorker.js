const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { connectDB } = require('../config/db.js');
const QuizSet = require('../models/QuizSet.js');
const {
  generateQuizFromGeminiFileWorker,
  uploadToGemini,
  deleteGemeiniFile,
} = require('../utils/generateQuiz.js');
const { downloadPdfToTemp } = require('../utils/downloadPdf.js');
// const fs = require('fs');
const fsPromises = require('fs').promises;
const { setupQueueGracefulShutdown } = require('../queues/quizQueue.js');

console.log('WORKER: Worker process starting...');

connectDB();

const redisConnection = new IORedis(
  {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: 'default',
    password: process.env.REDIS_PASSWORD,
  },
  { maxRetriesPerRequest: null, enableReadyCheck: false },
);

redisConnection.on('connect', () => console.log('WORKER: Connected to Redis.'));
redisConnection.on('error', (err) =>
  console.error('WORKER: Redis connection error:', err),
);

const processQuizJob = async (job) => {
  const { quizSetId, r2ObjectKey, originalFileName } = job.data;
  console.log(`\nWORKER: Processing job ${job.id} for QuizSet ${quizSetId}`);

  let tempFilePath;
  let geminiUploadedFile;

  try {
    tempFilePath = await downloadPdfToTemp(r2ObjectKey, originalFileName);
    geminiUploadedFile = await uploadToGemini(tempFilePath);

    const questions =
      await generateQuizFromGeminiFileWorker(geminiUploadedFile);

    await QuizSet.findByIdAndUpdate(quizSetId, {
      questions,
      status: 'ready',
      errorMessage: null,
    });
    console.log(
      `WORKER: Job ${job.id} SUCCESS. QuizSet ${quizSetId} updated to 'ready' with ${questions.length} questions.`,
    );
  } catch (error) {
    console.error(`WORKER: Job ${job.id} FAILED. Error: ${error.message}`);
    try {
      await QuizSet.findByIdAndUpdate(quizSetId, {
        status: 'error',
        errorMessage: error.message,
      });
    } catch (updateError) {
      console.error(
        `WORKER: Error updating QuizSet ${quizSetId} status to 'error': ${updateError.message}`,
      );
    }
  } finally {
    // cleanunp all local and remote files
    if (tempFilePath) {
      try {
        // Use the promise-based version of unlink
        await fsPromises.unlink(tempFilePath);
        console.log(`WORKER: Deleted temporary file ${tempFilePath}`);
      } catch (error) {
        console.error(
          `WORKER: Error deleting temporary file ${tempFilePath}: ${error.message}`,
        ); // Note: Error here doesn't fail the job, just logs the cleanup issue.
      }
    }

    if (geminiUploadedFile?.name) {
      await deleteGemeiniFile(geminiUploadedFile)
        .then(() =>
          console.log(`WORKER: Deleted Gemini file ${geminiUploadedFile.name}`),
        )
        .catch((error) =>
          console.error(
            `WORKER: Error deleting Gemini file ${geminiUploadedFile.name}: ${error.message}`,
          ),
        );
    }
  }
};

// init and start worker
const queueName = 'quizGeneration';
const worker = new Worker(queueName, processQuizJob, {
  connection: redisConnection,
  concurrency: 5,
  limiter: {
    max: 5,
    duration: 1000,
  },
});

console.log(
  `WORKER: Worker started, listening for jobs on queue '${queueName}'. Concurrency: ${worker.opts.concurrency}`,
);

worker.on('completed', (job) => {
  console.log(`WORKER: Job ${job.id} completed.`);
});

worker.on('failed', (job, err) => {
  console.error(`WORKER: Job ${job.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
  console.error(`WORKER: Worker error: ${err.message}`);
});

setupQueueGracefulShutdown();
