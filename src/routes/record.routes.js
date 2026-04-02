'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/record.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize }    = require('../middleware/rbac.middleware');
const { validate }     = require('../middleware/validate.middleware');
const {
  createRecordSchema,
  updateRecordSchema,
  recordFilterSchema,
} = require('../validators');

// All record routes require authentication.
router.use(authenticate);

// GET /api/records         – VIEWER, ANALYST, ADMIN
router.get('/', authorize('VIEWER'), validate(recordFilterSchema, 'query'), ctrl.listRecords);

// GET /api/records/:id     – VIEWER, ANALYST, ADMIN
router.get('/:id', authorize('VIEWER'), ctrl.getRecord);

// POST /api/records        – ANALYST, ADMIN only
router.post('/', authorize('ANALYST'), validate(createRecordSchema), ctrl.createRecord);

// PATCH /api/records/:id   – ANALYST (own) or ADMIN
router.patch('/:id', authorize('ANALYST'), validate(updateRecordSchema), ctrl.updateRecord);

// DELETE /api/records/:id  – ANALYST (own) or ADMIN (service enforces ownership)
router.delete('/:id', authorize('ANALYST'), ctrl.deleteRecord);

module.exports = router;
