const jwt = require('jsonwebtoken');
require('dotenv').config();

// Helper function to generate JWT
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    throw new Error('JWT Secret not configured');
  }
  if (!process.env.JWT_EXPIRES_IN) {
    console.warn(
      'JWT_EXPIRES_IN not set, using default (e.g., library default or none)',
    );
  }

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

module.exports = generateToken;
