const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: 'Not authorized, User not found' });
      }

      next();
    } catch (error) {
      console.error(`Token verification failed: ${error.message}`);
      return res
        .status(401)
        .json({ success: false, message: 'Not authorized, token failed.' });
    }
  } else {
    return res
      .status(401)
      .json({ success: false, message: 'Not authorized, no token.' });
  }
};

module.exports = { protect };
