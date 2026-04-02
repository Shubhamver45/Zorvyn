'use strict';

const { fail } = require('../utils/response');

/**
 * validate(schema) – Zod request body validation middleware.
 * Parses + coerces the body, then replaces req.body with the parsed value.
 * Returns 400 with field-level errors on failure.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field:   e.path.join('.'),
        message: e.message,
      }));
      return fail(res, 'Validation failed', 400, errors);
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
