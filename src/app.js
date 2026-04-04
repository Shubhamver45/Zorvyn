'use strict';

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');

const authRoutes    = require('./routes/auth.routes');
const userRoutes    = require('./routes/user.routes');
const recordRoutes  = require('./routes/record.routes');
const dashRoutes    = require('./routes/dashboard.routes');
const { errorHandler, notFound } = require('./middleware/error.middleware');
const limiter = require('./middleware/rateLimiter.middleware');

const app = express();

// ── Security & Parsing ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', limiter);

// ── Static Frontend Server ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/records',   recordRoutes);
app.use('/api/dashboard', dashRoutes);

// ── Root Info ────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'Zorvyn Finance API',
    version: '1.0.0',
    docs: 'See README.md for full API documentation',
    endpoints: {
      health:    'GET  /health',
      auth:      '/api/auth',
      users:     '/api/users',
      records:   '/api/records',
      dashboard: '/api/dashboard',
    },
  });
});

// ── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
