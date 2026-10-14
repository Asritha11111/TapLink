// src/middleware/auth.middleware.js
//
// verifyToken: Express middleware for protected routes.
// Expects an "Authorization: Bearer <token>" header.
// On success, sets req.user = decoded token payload and calls next().
// On failure, responds with 401 and does NOT continue.

const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing or malformed Authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired token',
    });
  }
}

module.exports = { verifyToken };