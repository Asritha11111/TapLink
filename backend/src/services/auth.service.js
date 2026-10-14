// src/services/auth.service.js
//
// Real authentication logic:
//   - registerUser: validate, hash password, save to DB, issue JWT
//   - loginUser: find user, verify password, issue JWT
//   - getCurrentUser: fetch from DB without exposing passwordHash

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const prisma = require('../config/prisma');

const SALT_ROUNDS = 12;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: sign a JWT containing only the user's id
// ─────────────────────────────────────────────────────────────────────────────
function signToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: safe user object (no passwordHash)
// ─────────────────────────────────────────────────────────────────────────────
function safeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// ─────────────────────────────────────────────────────────────────────────────
// registerUser
// ─────────────────────────────────────────────────────────────────────────────
async function registerUser({ name, email, password }) {
  // Normalize email to lower-case
  const normalizedEmail = email.trim().toLowerCase();

  // Check for duplicate email
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    const err = new Error('An account with that email already exists');
    err.status = 409;
    throw err;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    },
  });

  const token = signToken(user.id);

  return { token, user: safeUser(user) };
}

// ─────────────────────────────────────────────────────────────────────────────
// loginUser
// ─────────────────────────────────────────────────────────────────────────────
async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Use constant-time comparison to avoid user-enumeration
  if (!user) {
    await bcrypt.hash('dummy', SALT_ROUNDS); // timing equalizer
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const token = signToken(user.id);

  return { token, user: safeUser(user) };
}

// ─────────────────────────────────────────────────────────────────────────────
// getCurrentUser
// ─────────────────────────────────────────────────────────────────────────────
async function getCurrentUser(userId) {
  if (!userId) {
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return { user: safeUser(user) };
}

module.exports = { registerUser, loginUser, getCurrentUser };