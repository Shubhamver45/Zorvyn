'use strict';

/**
 * Standardised API response helpers.
 * All handlers should use these so the client always gets a consistent shape:
 *   { success, data, message, meta }
 */

function success(res, data = null, message = 'OK', statusCode = 200, meta = {}) {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (Object.keys(meta).length) body.meta = meta;
  return res.status(statusCode).json(body);
}

function created(res, data, message = 'Created') {
  return success(res, data, message, 201);
}

function noContent(res) {
  return res.status(204).send();
}

function fail(res, message = 'Bad Request', statusCode = 400, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

function unauthorized(res, message = 'Unauthorized') {
  return fail(res, message, 401);
}

function forbidden(res, message = 'Forbidden – insufficient permissions') {
  return fail(res, message, 403);
}

function notFound(res, message = 'Resource not found') {
  return fail(res, message, 404);
}

function serverError(res, message = 'Internal Server Error') {
  return fail(res, message, 500);
}

module.exports = { success, created, noContent, fail, unauthorized, forbidden, notFound, serverError };
