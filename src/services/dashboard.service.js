'use strict';

const prisma = require('../prisma/client');

const BASE_WHERE = { isDeleted: false };

// ── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getPeriodRange(period) {
  const now = new Date();
  const start = new Date(now);

  switch (period) {
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setMonth(now.getMonth() - 1); // default: last month
  }

  return { start, end: now };
}

// ── Dashboard Services ────────────────────────────────────────────────────────

/**
 * Overall summary: total income, total expenses, net balance, record count.
 */
async function getSummary(period = 'month') {
  const { start, end } = getPeriodRange(period);

  const records = await prisma.financialRecord.findMany({
    where: {
      ...BASE_WHERE,
      date: { gte: start, lte: end },
    },
    select: { amount: true, type: true },
  });

  let totalIncome   = 0;
  let totalExpenses = 0;

  for (const r of records) {
    if (r.type === 'INCOME')  totalIncome   += r.amount;
    if (r.type === 'EXPENSE') totalExpenses += r.amount;
  }

  return {
    period,
    dateRange: { from: start, to: end },
    totalIncome:    +totalIncome.toFixed(2),
    totalExpenses:  +totalExpenses.toFixed(2),
    netBalance:     +(totalIncome - totalExpenses).toFixed(2),
    recordCount:    records.length,
  };
}

/**
 * Breakdown of totals by category (both income and expense separately).
 */
async function getCategoryBreakdown(period = 'month') {
  const { start, end } = getPeriodRange(period);

  const records = await prisma.financialRecord.findMany({
    where: {
      ...BASE_WHERE,
      date: { gte: start, lte: end },
    },
    select: { amount: true, type: true, category: true },
  });

  const breakdown = {};
  for (const r of records) {
    if (!breakdown[r.category]) {
      breakdown[r.category] = { category: r.category, income: 0, expense: 0, net: 0 };
    }
    if (r.type === 'INCOME')  breakdown[r.category].income  += r.amount;
    if (r.type === 'EXPENSE') breakdown[r.category].expense += r.amount;
  }

  return Object.values(breakdown).map((c) => ({
    ...c,
    income:  +c.income.toFixed(2),
    expense: +c.expense.toFixed(2),
    net:     +(c.income - c.expense).toFixed(2),
  })).sort((a, b) => b.net - a.net);
}

/**
 * Monthly trend data for charting: grouped by year-month.
 * @param {number} months – how many past months to include (default 12)
 */
async function getMonthlyTrend(months = 12) {
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const records = await prisma.financialRecord.findMany({
    where: {
      ...BASE_WHERE,
      date: { gte: start },
    },
    select: { amount: true, type: true, date: true },
    orderBy: { date: 'asc' },
  });

  const monthMap = {};

  for (const r of records) {
    const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) {
      monthMap[key] = { month: key, income: 0, expense: 0, net: 0 };
    }
    if (r.type === 'INCOME')  monthMap[key].income  += r.amount;
    if (r.type === 'EXPENSE') monthMap[key].expense += r.amount;
  }

  return Object.values(monthMap).map((m) => ({
    ...m,
    income:  +m.income.toFixed(2),
    expense: +m.expense.toFixed(2),
    net:     +(m.income - m.expense).toFixed(2),
  }));
}

/**
 * Recent activity: last N records (default 10).
 */
async function getRecentActivity(limit = 10) {
  const records = await prisma.financialRecord.findMany({
    where:   BASE_WHERE,
    orderBy: { date: 'desc' },
    take:    limit,
    select: {
      id: true, amount: true, type: true, category: true, date: true, description: true,
      author: { select: { id: true, name: true } },
    },
  });
  return records;
}

/**
 * Weekly trend for the current and past N weeks.
 */
async function getWeeklyTrend(weeks = 8) {
  const start = new Date();
  start.setDate(start.getDate() - (weeks * 7));
  start.setHours(0, 0, 0, 0);

  const records = await prisma.financialRecord.findMany({
    where: {
      ...BASE_WHERE,
      date: { gte: start },
    },
    select: { amount: true, type: true, date: true },
    orderBy: { date: 'asc' },
  });

  // Build ISO week buckets: "YYYY-Www"
  const weekMap = {};
  for (const r of records) {
    const key = getISOWeek(r.date);
    if (!weekMap[key]) weekMap[key] = { week: key, income: 0, expense: 0, net: 0 };
    if (r.type === 'INCOME')  weekMap[key].income  += r.amount;
    if (r.type === 'EXPENSE') weekMap[key].expense += r.amount;
  }

  return Object.values(weekMap).map((w) => ({
    ...w,
    income:  +w.income.toFixed(2),
    expense: +w.expense.toFixed(2),
    net:     +(w.income - w.expense).toFixed(2),
  }));
}

function getISOWeek(date) {
  const d    = new Date(date);
  const day  = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo    = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
  getRecentActivity,
  getWeeklyTrend,
};
