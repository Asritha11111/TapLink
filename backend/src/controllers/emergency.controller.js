// src/controllers/emergency.controller.js

const emergencyService = require('../services/emergency.service');

async function sendAlert(req, res, next) {
  try {
    const { recipientIds, message, latitude, longitude } = req.body;
    const result = await emergencyService.sendAlert({
      senderId: req.user.id,
      recipientIds,
      message,
      latitude,
      longitude,
    });

    // Real-time delivery to recipient socket personal rooms
    const io = req.app.get('io');
    if (io && result.alerts) {
      result.alerts.forEach((alert) => {
        io.to('user:' + alert.recipientId).emit('emergency:alert', { message: { alert } });
      });
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function getMyAlerts(req, res, next) {
  try {
    res.json(await emergencyService.getMyAlerts(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function markAlertRead(req, res, next) {
  try {
    res.json(await emergencyService.markAlertRead({
      userId: req.user.id,
      alertId: req.params.id,
    }));
  } catch (err) {
    next(err);
  }
}

module.exports = { sendAlert, getMyAlerts, markAlertRead };
