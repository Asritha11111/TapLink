// src/services/auth.service.js
//
// This file will hold the actual authentication logic:
//   - registering a user (hash password, save to DB)
//   - logging in a user (verify password, issue JWT)
//   - fetching the current user
//
// For now, it is a stub with placeholder functions so that the
// controller and routes have something to call. Real logic will be
// added after the database (Prisma) is ready and coordinated with
// Member 4.

async function registerUser({ name, email, password }) {
  // TODO: validate input, hash password with bcrypt,
  //       create user in DB via Prisma, return safe user object.
  return {
    id: 'stub-id',
    name: name || 'placeholder',
    email: email || 'placeholder@example.com',
    message: 'registerUser not implemented yet',
  };
}

async function loginUser({ email, password }) {
  // TODO: find user by email, compare password with bcrypt,
  //       sign a JWT and return it.
  return {
    token: 'stub-token',
    message: 'loginUser not implemented yet',
  };
}

async function getCurrentUser(userId) {
  // TODO: fetch user by id from DB (without password field).
  return {
    id: userId || 'stub-id',
    message: 'getCurrentUser not implemented yet',
  };
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};