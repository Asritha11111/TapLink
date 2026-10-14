// src/routes/tapcode.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const tapcodeController = require('../controllers/tapcode.controller');

const router = express.Router();

// POST  /api/tapcodes/match     body: { pattern: ["S","L",...] }
router.post('/match', verifyToken, tapcodeController.matchPattern);
// POST  /api/tapcodes/:id/send   body: { recipientIds: [...] }
router.post('/:id/send', verifyToken, tapcodeController.sendTapCode);

// GET   /api/tapcodes
router.get('/',       verifyToken, tapcodeController.listTapCodes);
// POST  /api/tapcodes            body: { name, pattern, message }
router.post('/',      verifyToken, tapcodeController.createTapCode);
// GET   /api/tapcodes/:id
router.get('/:id',    verifyToken, tapcodeController.getTapCode);
// PUT   /api/tapcodes/:id        body: { name?, pattern?, message? }
router.put('/:id',    verifyToken, tapcodeController.updateTapCode);
// DELETE /api/tapcodes/:id
router.delete('/:id', verifyToken, tapcodeController.deleteTapCode);

module.exports = router;
