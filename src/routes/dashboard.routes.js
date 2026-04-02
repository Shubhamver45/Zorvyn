'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize }    = require('../middleware/rbac.middleware');

// All dashboard routes require at least VIEWER access.
router.use(authenticate, authorize('VIEWER'));

// GET /api/dashboard/summary?period=month|week|quarter|year
router.get('/summary',    ctrl.getSummary);

// GET /api/dashboard/categories?period=month|week|quarter|year
router.get('/categories', ctrl.getCategoryBreakdown);

// GET /api/dashboard/trends/monthly?months=12
router.get('/trends/monthly', ctrl.getMonthlyTrend);

// GET /api/dashboard/trends/weekly?weeks=8
router.get('/trends/weekly',  ctrl.getWeeklyTrend);

// GET /api/dashboard/recent?limit=10
router.get('/recent',    ctrl.getRecentActivity);

module.exports = router;
