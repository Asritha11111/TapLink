// src/routes/conversation.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const convController = require('../controllers/conversation.controller');
const msgController  = require('../controllers/message.controller');

const router = express.Router();

// GET  /api/conversations
router.get('/',     verifyToken, convController.listConversations);
// POST /api/conversations       body: { otherUserId }
router.post('/',    verifyToken, convController.getOrCreateConversation);

// GET  /api/conversations/:conversationId/messages?cursor=<id>
router.get('/:conversationId/messages',  verifyToken, msgController.getMessages);
// POST /api/conversations/:conversationId/messages   body: { body }
router.post('/:conversationId/messages', verifyToken, msgController.sendMessage);

module.exports = router;
