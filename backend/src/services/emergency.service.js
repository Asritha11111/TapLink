// src/services/emergency.service.js

const prisma = require('../config/prisma');

const DEFAULT_MSG = '🚨 EMERGENCY ALERT — I need help immediately!';

// ─── Send alert to multiple recipients ────────────────────────────────────────
async function sendAlert({ senderId, recipientIds, message, latitude, longitude }) {
  if (!recipientIds || recipientIds.length === 0) {
    throw Object.assign(new Error('At least one recipient is required'), { status: 400 });
  }

  // Verify all recipients are contacts of the sender
  const contactRows = await prisma.contact.findMany({
    where: { userId: senderId, targetId: { in: recipientIds } },
    select: { targetId: true },
  });
  const validIds = new Set(contactRows.map((c) => c.targetId));
  const invalidIds = recipientIds.filter((id) => !validIds.has(id));
  if (invalidIds.length > 0) {
    throw Object.assign(
      new Error('One or more recipients are not in your contacts'),
      { status: 403 }
    );
  }

  const alertMessage = (message && message.trim()) ? message.trim() : DEFAULT_MSG;

  // Validate coordinates if provided
  let validatedLat = null;
  let validatedLng = null;
  if (latitude != null) {
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw Object.assign(new Error('Invalid latitude value (must be between -90 and 90)'), { status: 400 });
    }
    validatedLat = lat;
  }
  if (longitude != null) {
    const lng = parseFloat(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw Object.assign(new Error('Invalid longitude value (must be between -180 and 180)'), { status: 400 });
    }
    validatedLng = lng;
  }

  const alerts = await prisma.$transaction(
    recipientIds.map((recipientId) =>
      prisma.emergencyAlert.create({
        data: {
          senderId,
          recipientId,
          message: alertMessage,
          ...(validatedLat != null ? { latitude: validatedLat }   : {}),
          ...(validatedLng != null ? { longitude: validatedLng } : {}),
        },
        include: {
          recipient: { select: { id: true, name: true, email: true } },
          sender:    { select: { id: true, name: true, email: true } },
        },
      })
    )
  );

  return { alerts };
}

// ─── Get incoming alerts for the authenticated user ────────────────────────────
async function getMyAlerts(userId) {
  const alerts = await prisma.emergencyAlert.findMany({
    where: { recipientId: userId },
    include: { sender: { select: { id: true, name: true, email: true } } },
    orderBy: { sentAt: 'desc' },
  });
  return { alerts };
}

// ─── Mark an alert as read ─────────────────────────────────────────────────────
async function markAlertRead({ userId, alertId }) {
  const alert = await prisma.emergencyAlert.findUnique({ where: { id: alertId } });
  if (!alert || alert.recipientId !== userId) {
    throw Object.assign(new Error('Alert not found'), { status: 404 });
  }
  if (alert.readAt) return { alert }; // already read

  const updated = await prisma.emergencyAlert.update({
    where: { id: alertId },
    data: { readAt: new Date() },
  });
  return { alert: updated };
}

module.exports = { sendAlert, getMyAlerts, markAlertRead };
