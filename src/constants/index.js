'use strict';

const ROLES = Object.freeze({
  VIEWER:  'VIEWER',
  ANALYST: 'ANALYST',
  ADMIN:   'ADMIN',
});

const STATUSES = Object.freeze({
  ACTIVE:   'ACTIVE',
  INACTIVE: 'INACTIVE',
});

const RECORD_TYPES = Object.freeze({
  INCOME:  'INCOME',
  EXPENSE: 'EXPENSE',
});

const CATEGORIES = Object.freeze([
  'Salary',
  'Freelance',
  'Bonus',
  'Investment',
  'Rent',
  'Utilities',
  'Groceries',
  'Transport',
  'Healthcare',
  'Education',
  'Entertainment',
  'Travel',
  'Other',
]);

// Role hierarchy – higher index = more permissions
const ROLE_HIERARCHY = [ROLES.VIEWER, ROLES.ANALYST, ROLES.ADMIN];

/**
 * Returns true if `userRole` has at least the level of `requiredRole`.
 */
function hasMinRole(userRole, requiredRole) {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

module.exports = { ROLES, STATUSES, RECORD_TYPES, CATEGORIES, ROLE_HIERARCHY, hasMinRole };
