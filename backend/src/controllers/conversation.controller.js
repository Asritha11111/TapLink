// src/controllers/conversation.controller.js

const conversationService = require('../services/conversation.service');

async function listConversations(req, res, next) {
  try {
    const result = await conversationService.listConversations(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getOrCreateConversation(req, res, next) {
  try {
    const result = await conversationService.getOrCreateConversation({
      userId: req.user.id,
      otherUserId: req.body.otherUserId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listConversations, getOrCreateConversation };
