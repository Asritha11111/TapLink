// src/routes/location.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const prisma  = require('../config/prisma');

const router = express.Router();

// POST /api/location — store a consented location share
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }
    await prisma.locationShare.create({
      data: { userId: req.user.id, latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
    });
    res.status(201).json({ message: 'Location shared' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
