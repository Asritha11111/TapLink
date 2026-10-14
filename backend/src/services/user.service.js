// src/services/user.service.js — Search users for adding contacts

const prisma = require('../config/prisma');

async function searchUsers({ query, requestingUserId }) {
  if (!query || query.trim().length < 2) {
    const err = new Error('Search query must be at least 2 characters');
    err.status = 400;
    throw err;
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: requestingUserId } },
        {
          OR: [
            { name:  { contains: query.trim(), mode: 'insensitive' } },
            { email: { contains: query.trim(), mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: { id: true, name: true, email: true, createdAt: true },
    take: 20,
  });

  return { users };
}

module.exports = { searchUsers };
