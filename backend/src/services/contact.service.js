// src/services/contact.service.js

const prisma = require('../config/prisma');

// ─── List contacts ────────────────────────────────────────────────────────────
async function listContacts(userId) {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    include: {
      target: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return { contacts: contacts.map((c) => ({ ...c.target, contactId: c.id })) };
}

// ─── Add contact ─────────────────────────────────────────────────────────────
async function addContact({ userId, targetId, email }) {
  let resolvedTargetId = targetId;

  // If email was provided, lookup the user by email
  if (!resolvedTargetId && email) {
    const cleanEmail = email.trim().toLowerCase();
    const targetUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, name: true, email: true },
    });
    if (!targetUser) {
      const err = new Error('No registered user found with that email address');
      err.status = 404;
      throw err;
    }
    resolvedTargetId = targetUser.id;
  }

  if (!resolvedTargetId) {
    const err = new Error('Target user ID or email is required');
    err.status = 400;
    throw err;
  }

  if (userId === resolvedTargetId) {
    const err = new Error('You cannot add yourself as a contact');
    err.status = 400;
    throw err;
  }

  // Verify target user exists
  const target = await prisma.user.findUnique({
    where: { id: resolvedTargetId },
    select: { id: true, name: true, email: true },
  });
  if (!target) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  // Prevent duplicates
  const existing = await prisma.contact.findUnique({
    where: { userId_targetId: { userId, targetId: resolvedTargetId } },
  });
  if (existing) {
    const err = new Error('Contact already added');
    err.status = 409;
    throw err;
  }

  const created = await prisma.contact.create({
    data: { userId, targetId: resolvedTargetId },
  });

  return { contact: { ...target, contactId: created.id, message: 'Contact added' } };
}

// ─── Remove contact ───────────────────────────────────────────────────────────
async function removeContact({ userId, targetId }) {
  const contact = await prisma.contact.findUnique({
    where: { userId_targetId: { userId, targetId } },
  });
  if (!contact) {
    const err = new Error('Contact not found');
    err.status = 404;
    throw err;
  }

  await prisma.contact.delete({
    where: { userId_targetId: { userId, targetId } },
  });

  return { message: 'Contact removed' };
}

module.exports = { listContacts, addContact, removeContact };
