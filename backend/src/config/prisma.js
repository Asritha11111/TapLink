// src/config/prisma.js
//
// A single shared PrismaClient instance for the whole backend.
// Import this from services instead of creating new PrismaClient()
// in each file — otherwise you'll exhaust the DB connection pool.
//
// If Member 4 later moves/renames this file, update the imports
// in the services that use it.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;