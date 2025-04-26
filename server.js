const express = require('express');
const app = express();
const { connectDB } = require('./config/db');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes.js');
const quizRoutes = require('./routes/quizRoutes.js');
const sessionRoutes = require('./routes/sessionRoutes.js');
const userRoutes = require('./routes/userRoutes.js');

connectDB();

// rn set to all origins
app.use(cors());

// parse json data
app.use(express.json());

// parse urlencoded form data
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the PDF Quiz Generator API!' });
});

app.get('/health', (req, res) => {
  // throw new Error("Health check failed");
  res.json({ message: 'Healthy' });
});

// placeholder routes
app.use('/api/auth', authRoutes); // e.g., /api/auth/register, /api/auth/login
app.use('/api/quiz', quizRoutes); // e.g., /api/quiz/upload, /api/quiz/:id
app.use('/api/sessions', sessionRoutes); // e.g., /api/sessions
app.use('/api/users', userRoutes); // e.g., /api/users/me

app.use((err, res) => {
  console.error('unhandled error: ', err.stack || err);
  res
    .status(err.statusCode || 500)
    .json({ message: err.message || 'Internal Server Error' });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
