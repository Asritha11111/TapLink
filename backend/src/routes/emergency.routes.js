// src/routes/emergency.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const emergencyController = require('../controllers/emergency.controller');

const router = express.Router();

// POST   /api/emergency          body: { recipientIds, message?, latitude?, longitude? }
router.post('/',       verifyToken, emergencyController.sendAlert);
// GET    /api/emergency           incoming alerts for current user
router.get('/',        verifyToken, emergencyController.getMyAlerts);
// PATCH  /api/emergency/:id/read  mark as read
router.patch('/:id/read', verifyToken, emergencyController.markAlertRead);

module.exports = router;
