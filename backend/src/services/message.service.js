// src/services/message.service.js

const prisma = require('../config/prisma');
const { assertParticipant } = require('./conversation.service');

const PAGE_SIZE = 40;

// ─── Send a message ───────────────────────────────────────────────────────────
async function sendMessage({ conversationId, senderId, body }) {
  if (!body || body.trim().length === 0) {
    const err = new Error('Message body cannot be empty');
    err.status = 400;
    throw err;
  }
  if (body.length > 2000) {
    const err = new Error('Message too long (max 2000 characters)');
    err.status = 400;
    throw err;
  }

  // Verify sender is a participant
  await assertParticipant(conversationId, senderId);

  const message = await prisma.message.create({
    data: { conversationId, senderId, body: body.trim() },
    include: { sender: { select: { id: true, name: true, email: true } } },
  });

  // Update conversation updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return { message };
}

// ─── Get message history (paginated) ─────────────────────────────────────────
async function getMessages({ conversationId, userId, cursor }) {
  await assertParticipant(conversationId, userId);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: { sender: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const nextCursor = messages.length === PAGE_SIZE ? messages[messages.length - 1].id : null;

  return { messages: messages.reverse(), nextCursor };
}

module.exports = { sendMessage, getMessages };
