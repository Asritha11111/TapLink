// src/routes/user.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();

// GET /api/users/search?q=<query>
router.get('/search', verifyToken, userController.searchUsers);

module.exports = router;
