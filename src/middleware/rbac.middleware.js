'use strict';

const { hasMinRole }  = require('../constants');
const { forbidden }   = require('../utils/response');

/**
 * authorize(...roles) – factory that returns a middleware which checks
 * whether req.user has at least the minimum required role.
 *
 * Usage:
 *   router.post('/records', authenticate, authorize('ANALYST'), handler)
 *
 * The role check uses hierarchy: VIEWER < ANALYST < ADMIN
 * So authorize('ANALYST') allows ANALYST and ADMIN, but not VIEWER.
 */
function authorize(...requiredRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return forbidden(res, 'Authentication required');
    }

    const userRole = req.user.role;

    // Check if the user satisfies ANY of the required roles
    const allowed = requiredRoles.some((r) => hasMinRole(userRole, r));

    if (!allowed) {
      return forbidden(
        res,
        `Role '${userRole}' is not permitted to perform this action`
      );
    }

    next();
  };
}

module.exports = { authorize };
