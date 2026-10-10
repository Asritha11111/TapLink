// src/server.js

// 1. Load environment variables from .env
require('dotenv').config();

// 2. Import core packages
const express = require('express');
const cors = require('cors');

// 3. Create the Express application
const app = express();

// 4. Global middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// 5. Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'TapLink backend' });
});

// 6. 404 handler (no route matched)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 7. Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// 8. Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`TapLink backend running on http://localhost:${PORT}`);
});