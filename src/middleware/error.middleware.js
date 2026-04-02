'use strict';

const { fail } = require('../utils/response');

/**
 * Global error handler – catches any error passed to next(err).
 * Prisma-specific errors are translated into readable messages.
 */
function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message || err);

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field';
    return fail(res, `A record with this ${field} already exists`, 409);
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return fail(res, 'Record not found', 404);
  }

  // Zod validation that escaped the middleware (shouldn't happen, but guard anyway)
  if (err.name === 'ZodError') {
    const errors = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    return fail(res, 'Validation failed', 400, errors);
  }

  const status  = err.statusCode || err.status || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';
  return fail(res, message, status);
}

/**
 * 404 handler – called when no route matches.
 */
function notFound(req, res) {
  return fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = { errorHandler, notFound };
