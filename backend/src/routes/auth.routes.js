// src/routes/auth.routes.js
//
// This file defines the URL paths for authentication.
// It does NOT contain business logic — it just points each path
// to the correct controller function.
//
// Full URL prefix will be set in server.js when we mount these
// routes under /api/auth.
const { verifyToken } = require('../middleware/auth.middleware');
const express = require('express');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// POST /api/auth/register  → create a new user
router.post('/register', authController.register);

// POST /api/auth/login     → log in and receive a JWT
router.post('/login', authController.login);

// GET  /api/auth/me        → return the logged-in user
router.get('/me', verifyToken, authController.me);

module.exports = router;