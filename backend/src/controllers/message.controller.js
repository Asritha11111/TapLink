// src/controllers/message.controller.js
//
// After persisting a message, emit it via Socket.IO to the conversation room
// so connected participants receive it in real time.

const messageService = require('../services/message.service');

async function getMessages(req, res, next) {
  try {
    const result = await messageService.getMessages({
      conversationId: req.params.conversationId,
      userId: req.user.id,
      cursor: req.query.cursor,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function sendMessage(req, res, next) {
  try {
    const result = await messageService.sendMessage({
      conversationId: req.params.conversationId,
      senderId: req.user.id,
      body: req.body.body,
    });

    // Real-time delivery to conversation room
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${req.params.conversationId}`).emit('message:new', result);
    }

    // Also deliver to recipient personal rooms (for notification when not in room)
    // Get all other participants
    try {
      const prisma = require('../config/prisma');
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: req.params.conversationId },
        select: { userId: true },
      });
      participants.forEach(({ userId }) => {
        if (userId !== req.user.id && io) {
          io.to(`user:${userId}`).emit('message:notification', result);
        }
      });
    } catch { /* not critical */ }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMessages, sendMessage };
