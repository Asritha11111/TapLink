// src/routes/contact.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const contactController = require('../controllers/contact.controller');

const router = express.Router();

// GET    /api/contacts
router.get('/',               verifyToken, contactController.listContacts);
// POST   /api/contacts        body: { targetId }
router.post('/',              verifyToken, contactController.addContact);
// DELETE /api/contacts/:targetId
router.delete('/:targetId',   verifyToken, contactController.removeContact);

module.exports = router;
