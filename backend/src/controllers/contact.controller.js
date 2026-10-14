// src/controllers/contact.controller.js

const contactService = require('../services/contact.service');

async function listContacts(req, res, next) {
  try {
    const result = await contactService.listContacts(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function addContact(req, res, next) {
  try {
    const result = await contactService.addContact({
      userId: req.user.id,
      targetId: req.body.targetId,
      email: req.body.email,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function removeContact(req, res, next) {
  try {
    const result = await contactService.removeContact({
      userId: req.user.id,
      targetId: req.params.targetId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listContacts, addContact, removeContact };
