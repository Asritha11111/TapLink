// src/controllers/auth.controller.js
//
// The controller sits between the route and the service.
//   route      → "POST /register came in, call controller.register"
//   controller → reads req.body, calls service, sends response
//   service    → does the heavy lifting (DB, hashing, JWT)
//
// For now, the service returns stubs, so these handlers just
// pass those along. Real validation and error handling will be
// added once the service logic is in place.

const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.registerUser({ name, email, password });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    // req.user will be set by the auth middleware later.
    // For now, it is undefined, so we pass a placeholder.
    const userId = req.user?.id;
    const result = await authService.getCurrentUser(userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  me,
};