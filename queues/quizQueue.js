const { Queue } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

const redisConnection = new IORedis(
  {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: 'default',
    password: process.env.REDIS_PASSWORD,
  },
  { maxRetriesPerRequest: null, enableReadyCheck: false },
);

redisConnection.on('error', (err) => {
  console.error(`error connecting to redis: ${err.message}`);
});

redisConnection.on('connect', () => {
  console.log('QUEUE: connected to redis');
});

const quizGeneratorQueue = new Queue('quizGeneration', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { age: 3600 * 24 },
    removeOnFail: { age: 3600 * 24 * 7 },
  },
});

const setupQueueGracefulShutdown = async () => {
  const shutdown = async () => {
    console.log('Shutting down queuecand redis...');
    await quizGeneratorQueue.close();
    await redisConnection.quit();
    console.log('Queue shutdown complete');
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

module.exports = {
  quizGeneratorQueue,
  setupQueueGracefulShutdown,
};
