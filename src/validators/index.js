'use strict';

const { z } = require('zod');
const { ROLES, STATUSES, RECORD_TYPES, CATEGORIES } = require('../constants');

// ── Auth ──────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role:     z.enum(Object.values(ROLES)).optional(),
});

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ── Users ─────────────────────────────────────────────────────────────────────

const updateUserSchema = z.object({
  name:   z.string().min(2).optional(),
  role:   z.enum(Object.values(ROLES)).optional(),
  status: z.enum(Object.values(STATUSES)).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

// ── Financial Records ─────────────────────────────────────────────────────────

const createRecordSchema = z.object({
  amount:      z.number({ required_error: 'Amount is required' }).positive('Amount must be positive'),
  type:        z.enum(Object.values(RECORD_TYPES), { required_error: 'Type is required' }),
  category:    z.string().trim().min(1, 'Category is required'),
  date:        z.coerce.date({ required_error: 'Date is required' }),
  description: z.string().max(500).optional(),
  tags:        z.array(z.string().trim()).optional(),
});

const updateRecordSchema = z.object({
  amount:      z.number().positive().optional(),
  type:        z.enum(Object.values(RECORD_TYPES)).optional(),
  category:    z.string().trim().min(1).optional(),
  date:        z.coerce.date().optional(),
  description: z.string().max(500).optional(),
  tags:        z.array(z.string().trim()).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

// Allowed query-param filters for GET /records
const recordFilterSchema = z.object({
  type:       z.enum(Object.values(RECORD_TYPES)).optional(),
  category:   z.string().optional(),
  startDate:  z.string().optional(),
  endDate:    z.string().optional(),
  search:     z.string().optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().positive().max(100).default(20),
  sortBy:     z.enum(['date', 'amount', 'createdAt']).default('date'),
  sortOrder:  z.enum(['asc', 'desc']).default('desc'),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  updateUserSchema,
  createRecordSchema,
  updateRecordSchema,
  recordFilterSchema,
};
