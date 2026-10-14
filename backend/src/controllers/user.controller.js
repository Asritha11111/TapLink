// src/controllers/user.controller.js

const userService = require('../services/user.service');

async function searchUsers(req, res, next) {
  try {
    const result = await userService.searchUsers({
      query: req.query.q,
      requestingUserId: req.user.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { searchUsers };
