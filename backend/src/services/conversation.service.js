// src/services/conversation.service.js

const prisma = require('../config/prisma');

// ─── Get or create a 1-to-1 conversation between two users ────────────────────
async function getOrCreateConversation({ userId, otherUserId }) {
  if (userId === otherUserId) {
    const err = new Error('Cannot create a conversation with yourself');
    err.status = 400;
    throw err;
  }

  // Find existing conversation where both users are participants
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: otherUserId } } },
        // Exactly 2 participants (1-to-1)
        { participants: { every: { userId: { in: [userId, otherUserId] } } } },
      ],
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (existing) return { conversation: existing };

  // Create new conversation
  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId }, { userId: otherUserId }],
      },
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  return { conversation };
}

// ─── List all conversations for a user ────────────────────────────────────────
async function listConversations(userId) {
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: { select: { id: true, name: true, email: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return { conversations };
}

// ─── Assert user is a participant ─────────────────────────────────────────────
async function assertParticipant(conversationId, userId) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }
}

module.exports = { getOrCreateConversation, listConversations, assertParticipant };
