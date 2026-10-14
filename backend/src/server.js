// src/server.js — TapLink backend entry point

require('dotenv').config();

const http   = require('http');
const express = require('express');
const cors    = require('cors');
const { Server } = require('socket.io');

const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const contactRoutes      = require('./routes/contact.routes');
const conversationRoutes = require('./routes/conversation.routes');
const tapcodeRoutes      = require('./routes/tapcode.routes');
const emergencyRoutes    = require('./routes/emergency.routes');
const locationRoutes     = require('./routes/location.routes');

const { setupSocketHandler } = require('./sockets/socket.handler');

// ─────────────────────────────────────────────────────────────────────────────
// Express app
// ─────────────────────────────────────────────────────────────────────────────
const app = express();

const FRONTEND_URL = process.env.CLIENT_ORIGIN || 'https://taplink-frontend.onrender.com';

app.use(express.json({ limit: '50kb' }));
app.use(
  cors({
    origin: [
      'https://taplink-frontend.onrender.com',
      'http://localhost:5173',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'TapLink backend', ts: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/contacts',      contactRoutes);
app.use('/api/conversations',  conversationRoutes);
app.use('/api/tapcodes',      tapcodeRoutes);
app.use('/api/emergency',     emergencyRoutes);
app.use('/api/location',      locationRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Never log the full error object — it may contain sensitive data
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP server + Socket.IO
// ─────────────────────────────────────────────────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: FRONTEND_URL, credentials: true },
});

// Wire up socket events and get io reference for REST-layer use
setupSocketHandler(io);

// Attach io to app so route handlers can emit events (e.g. new message)
app.set('io', io);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
  console.log(`TapLink backend running on http://localhost:${PORT}`);
  });
}

module.exports = { app, server, io }; // exported for tests
