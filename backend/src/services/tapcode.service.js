// src/services/tapcode.service.js
//
// TapCode patterns are stored as JSON-encoded strings, e.g.:
//   ["S","S","L","S"]   (S = short tap, L = long tap)
//
// Matching rules:
// - A "short" tap is a press held < 300 ms
// - A "long"  tap is a press held ≥ 300 ms
// - Taps are grouped into one pattern when gaps between consecutive taps
//   are < 1500 ms; a gap ≥ 1500 ms ends the pattern.
// These rules are enforced in the frontend; the backend stores & matches
// the encoded string as-is.

const prisma = require('../config/prisma');

function encodePattern(pattern) {
  if (!Array.isArray(pattern) || pattern.length === 0) {
    throw Object.assign(new Error('Pattern must be a non-empty array of "S" and "L" values'), { status: 400 });
  }
  const cleaned = pattern.map((t) => {
    if (t !== 'S' && t !== 'L') {
      throw Object.assign(new Error('Each tap must be "S" (short) or "L" (long)'), { status: 400 });
    }
    return t;
  });
  return JSON.stringify(cleaned);
}

// ─── Create ───────────────────────────────────────────────────────────────────
async function createTapCode({ userId, name, pattern, message }) {
  const encoded = encodePattern(pattern);

  const existing = await prisma.tapCode.findUnique({
    where: { userId_pattern: { userId, pattern: encoded } },
  });
  if (existing) {
    throw Object.assign(new Error('You already have a TapCode with this pattern'), { status: 409 });
  }

  const tapCode = await prisma.tapCode.create({
    data: { userId, name: name.trim(), pattern: encoded, message: message.trim() },
  });

  return { tapCode: { ...tapCode, pattern: JSON.parse(tapCode.pattern) } };
}

// ─── List ─────────────────────────────────────────────────────────────────────
async function listTapCodes(userId) {
  const codes = await prisma.tapCode.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return { tapCodes: codes.map((c) => ({ ...c, pattern: JSON.parse(c.pattern) })) };
}

// ─── Get one ──────────────────────────────────────────────────────────────────
async function getTapCode({ userId, tapCodeId }) {
  const code = await prisma.tapCode.findUnique({ where: { id: tapCodeId } });
  if (!code || code.userId !== userId) {
    throw Object.assign(new Error('TapCode not found'), { status: 404 });
  }
  return { tapCode: { ...code, pattern: JSON.parse(code.pattern) } };
}

// ─── Update ───────────────────────────────────────────────────────────────────
async function updateTapCode({ userId, tapCodeId, name, pattern, message }) {
  const code = await prisma.tapCode.findUnique({ where: { id: tapCodeId } });
  if (!code || code.userId !== userId) {
    throw Object.assign(new Error('TapCode not found'), { status: 404 });
  }

  const encoded = pattern ? encodePattern(pattern) : code.pattern;

  // Check for pattern conflict (exclude self)
  if (pattern) {
    const conflict = await prisma.tapCode.findFirst({
      where: { userId, pattern: encoded, id: { not: tapCodeId } },
    });
    if (conflict) {
      throw Object.assign(new Error('Another TapCode already uses this pattern'), { status: 409 });
    }
  }

  const updated = await prisma.tapCode.update({
    where: { id: tapCodeId },
    data: {
      ...(name    ? { name:    name.trim()    } : {}),
      ...(pattern ? { pattern: encoded        } : {}),
      ...(message ? { message: message.trim() } : {}),
    },
  });

  return { tapCode: { ...updated, pattern: JSON.parse(updated.pattern) } };
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteTapCode({ userId, tapCodeId }) {
  const code = await prisma.tapCode.findUnique({ where: { id: tapCodeId } });
  if (!code || code.userId !== userId) {
    throw Object.assign(new Error('TapCode not found'), { status: 404 });
  }
  await prisma.tapCode.delete({ where: { id: tapCodeId } });
  return { message: 'TapCode deleted' };
}

// ─── Match a pattern ──────────────────────────────────────────────────────────
async function matchPattern({ userId, pattern }) {
  const encoded = encodePattern(pattern);
  const code = await prisma.tapCode.findUnique({
    where: { userId_pattern: { userId, pattern: encoded } },
  });
  if (!code) {
    return { matched: false, pattern, message: null };
  }
  return { matched: true, tapCode: { ...code, pattern: JSON.parse(code.pattern) } };
}


// ─── Send message via TapCode to contacts ─────────────────────────────────────
async function sendTapCodeMessage({ userId, tapCodeId, recipientIds, io }) {
  if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
    throw Object.assign(new Error('At least one contact recipient must be selected'), { status: 400 });
  }

  const code = await prisma.tapCode.findUnique({ where: { id: tapCodeId } });
  if (!code || code.userId !== userId) {
    throw Object.assign(new Error('TapCode not found'), { status: 404 });
  }

  if (!code.message || !code.message.trim()) {
    throw Object.assign(
      new Error('This TapCode does not have an associated message. Please edit this TapCode to add a message before sending.'),
      { status: 400 }
    );
  }

  // Validate that all recipients are registered contacts of the user
  const contactRows = await prisma.contact.findMany({
    where: { userId, targetId: { in: recipientIds } },
    include: { target: { select: { id: true, name: true, email: true } } },
  });
  const validMap = new Map(contactRows.map((c) => [c.targetId, c.target]));
  const invalidIds = recipientIds.filter((id) => !validMap.has(id));
  if (invalidIds.length > 0) {
    throw Object.assign(
      new Error('One or more selected recipients are not in your contacts list'),
      { status: 403 }
    );
  }

  const conversationService = require('./conversation.service');
  const deliveries = [];

  for (const recipientId of recipientIds) {
    const { conversation } = await conversationService.getOrCreateConversation({
      userId,
      otherUserId: recipientId,
    });

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        body: code.message.trim(),
      },
      include: { sender: { select: { id: true, name: true, email: true } } },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    if (io) {
      io.to('conv:' + conversation.id).emit('message:new', { message });
      io.to('user:' + recipientId).emit('message:notification', { message });
    }

    deliveries.push({
      recipient: validMap.get(recipientId),
      conversationId: conversation.id,
      messageId: message.id,
      createdAt: message.createdAt,
    });
  }

  return {
    success: true,
    tapCode: { id: code.id, name: code.name, message: code.message },
    sentCount: deliveries.length,
    deliveries,
  };
}

module.exports = { createTapCode, listTapCodes, getTapCode, updateTapCode, deleteTapCode, matchPattern, sendTapCodeMessage };
