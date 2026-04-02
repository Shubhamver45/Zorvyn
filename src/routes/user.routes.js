'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize }    = require('../middleware/rbac.middleware');
const { validate }     = require('../middleware/validate.middleware');
const { updateUserSchema } = require('../validators');

// All user routes require authentication.
router.use(authenticate);

// GET /api/users          – ADMIN only
router.get('/', authorize('ADMIN'), ctrl.listUsers);

// GET /api/users/:id      – ADMIN only (or own profile via auth/me)
router.get('/:id', authorize('ADMIN'), ctrl.getUser);

// PATCH /api/users/:id    – ADMIN only
router.patch('/:id', authorize('ADMIN'), validate(updateUserSchema), ctrl.updateUser);

// PATCH /api/users/:id/deactivate – ADMIN only
router.patch('/:id/deactivate', authorize('ADMIN'), ctrl.deactivateUser);

// DELETE /api/users/:id   – ADMIN only
router.delete('/:id', authorize('ADMIN'), ctrl.deleteUser);

module.exports = router;
