'use strict';

const dashService = require('../services/dashboard.service');
const R           = require('../utils/response');

async function getSummary(req, res, next) {
  try {
    const { period = 'month' } = req.query;
    const data = await dashService.getSummary(period);
    return R.success(res, data, 'Dashboard summary');
  } catch (err) { next(err); }
}

async function getCategoryBreakdown(req, res, next) {
  try {
    const { period = 'month' } = req.query;
    const data = await dashService.getCategoryBreakdown(period);
    return R.success(res, data, 'Category breakdown');
  } catch (err) { next(err); }
}

async function getMonthlyTrend(req, res, next) {
  try {
    const { months = 12 } = req.query;
    const data = await dashService.getMonthlyTrend(parseInt(months, 10));
    return R.success(res, data, 'Monthly trend');
  } catch (err) { next(err); }
}

async function getWeeklyTrend(req, res, next) {
  try {
    const { weeks = 8 } = req.query;
    const data = await dashService.getWeeklyTrend(parseInt(weeks, 10));
    return R.success(res, data, 'Weekly trend');
  } catch (err) { next(err); }
}

async function getRecentActivity(req, res, next) {
  try {
    const { limit = 10 } = req.query;
    const data = await dashService.getRecentActivity(parseInt(limit, 10));
    return R.success(res, data, 'Recent activity');
  } catch (err) { next(err); }
}

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
  getWeeklyTrend,
  getRecentActivity,
};
