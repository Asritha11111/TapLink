// src/middleware/validate.middleware.js
//
// Small, dependency-free validators for auth endpoints.
// Each function checks req.body and either:
//   - responds 400 with an error message, OR
//   - calls next() to continue to the controller.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validateRegister(req, res, next) {
  const { name, email, password } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({
      error: 'Name is required and must be at least 2 characters',
    });
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  return next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  return next();
}

module.exports = { validateRegister, validateLogin };