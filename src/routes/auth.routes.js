'use strict';

const router  = require('express').Router();
const ctrl    = require('../controllers/auth.controller');
const { authenticate }   = require('../middleware/auth.middleware');
const { validate }       = require('../middleware/validate.middleware');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
} = require('../validators');

// POST /api/auth/register
// Public – anyone can sign up as VIEWER.
// Admins can POST with ?adminKey or be authenticated to assign roles.
router.post('/register', validate(registerSchema), ctrl.register);

// POST /api/auth/login
router.post('/login', validate(loginSchema), ctrl.login);

// POST /api/auth/refresh
router.post('/refresh', validate(refreshSchema), ctrl.refresh);

// POST /api/auth/logout
router.post('/logout', validate(refreshSchema), ctrl.logout);

// GET /api/auth/me  (protected)
router.get('/me', authenticate, ctrl.getProfile);

module.exports = router;
