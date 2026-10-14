// src/controllers/tapcode.controller.js

const tapcodeService = require('../services/tapcode.service');

async function listTapCodes(req, res, next) {
  try {
    res.json(await tapcodeService.listTapCodes(req.user.id));
  } catch (err) { next(err); }
}

async function createTapCode(req, res, next) {
  try {
    const { name, pattern, message } = req.body;
    res.status(201).json(await tapcodeService.createTapCode({
      userId: req.user.id, name, pattern, message,
    }));
  } catch (err) { next(err); }
}

async function getTapCode(req, res, next) {
  try {
    res.json(await tapcodeService.getTapCode({
      userId: req.user.id, tapCodeId: req.params.id,
    }));
  } catch (err) { next(err); }
}

async function updateTapCode(req, res, next) {
  try {
    const { name, pattern, message } = req.body;
    res.json(await tapcodeService.updateTapCode({
      userId: req.user.id, tapCodeId: req.params.id, name, pattern, message,
    }));
  } catch (err) { next(err); }
}

async function deleteTapCode(req, res, next) {
  try {
    res.json(await tapcodeService.deleteTapCode({
      userId: req.user.id, tapCodeId: req.params.id,
    }));
  } catch (err) { next(err); }
}

async function matchPattern(req, res, next) {
  try {
    res.json(await tapcodeService.matchPattern({
      userId: req.user.id, pattern: req.body.pattern,
    }));
  } catch (err) { next(err); }
}


async function sendTapCode(req, res, next) {
  try {
    const io = req.app.get('io');
    const result = await tapcodeService.sendTapCodeMessage({
      userId: req.user.id,
      tapCodeId: req.params.id,
      recipientIds: req.body.recipientIds,
      io,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listTapCodes, createTapCode, getTapCode, updateTapCode, deleteTapCode, matchPattern, sendTapCode };
