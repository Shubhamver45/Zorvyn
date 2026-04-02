'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { unauthorized }      = require('../utils/response');

/**
 * authenticate – validates the Bearer token from the Authorization header
 * and attaches the decoded user payload to req.user.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided');
  }

  const token = header.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token expired – please refresh');
    }
    return unauthorized(res, 'Invalid token');
  }
}

module.exports = { authenticate };
