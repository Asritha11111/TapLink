// src/sockets/socket.handler.js
//
// Authenticated Socket.IO handler.
// Authentication: the client passes the JWT as the "auth.token" handshake
// parameter.  We verify it here before allowing any event to be processed.
//
// Online status:
// - Each user can have multiple concurrent connections (tabs, devices).
// - We track a Set of socket IDs per userId.
// - We only broadcast "user:offline" when the last connection closes.
//
// Message delivery:
// - The backend REST API persists messages; socket delivers them in real time.
// - Socket events do NOT bypass REST authorization.

const jwt    = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { assertParticipant } = require('../services/conversation.service');

// Map: userId → Set<socketId>
const onlineUsers = new Map();

function getUserIdFromToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch {
    return null;
  }
}

function setupSocketHandler(io) {
  // ─── Authentication middleware ────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const userId = getUserIdFromToken(token);
    if (!userId) {
      return next(new Error('Unauthorized'));
    }
    socket.userId = userId;
    next();
  });

  // ─── Connection ───────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { userId } = socket;

    // Track connection
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal room so we can deliver messages to a specific user
    socket.join(`user:${userId}`);

    // Broadcast online status only on first connection for this user
    if (onlineUsers.get(userId).size === 1) {
      io.emit('user:online', { userId });
    }

    // ─── Join a conversation room ────────────────────────────────────────
    socket.on('conversation:join', async ({ conversationId }) => {
      try {
        await assertParticipant(conversationId, userId);
        socket.join(`conv:${conversationId}`);
        socket.emit('conversation:joined', { conversationId });
      } catch {
        socket.emit('error', { message: 'Cannot join conversation' });
      }
    });

    // ─── Leave a conversation room ───────────────────────────────────────
    socket.on('conversation:leave', ({ conversationId }) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ─── Deliver a new message (called by the REST layer) ────────────────
    // The REST route saves the message then calls:
    //   io.to(`conv:${conversationId}`).emit('message:new', { message });
    // That is wired in server.js so io is accessible there.

    // ─── Typing indicator ────────────────────────────────────────────────
    socket.on('typing:start', async ({ conversationId }) => {
      try {
        await assertParticipant(conversationId, userId);
        socket.to(`conv:${conversationId}`).emit('typing:start', { userId, conversationId });
      } catch { /* not a participant — ignore */ }
    });

    socket.on('typing:stop', async ({ conversationId }) => {
      try {
        await assertParticipant(conversationId, userId);
        socket.to(`conv:${conversationId}`).emit('typing:stop', { userId, conversationId });
      } catch { /* ignore */ }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user:offline', { userId });
        }
      }
    });
  });

  return { onlineUsers };
}

// Expose online check for other parts of the system
function isOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

module.exports = { setupSocketHandler, isOnline };
