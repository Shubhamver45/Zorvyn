'use strict';

const prisma = require('../prisma/client');

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildWhere({ type, category, startDate, endDate, search }) {
  const where = { isDeleted: false };

  if (type)     where.type     = type;
  if (category) where.category = { equals: category, mode: 'insensitive' };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate)   where.date.lte = new Date(endDate);
  }

  if (search) {
    where.description = { contains: search, mode: 'insensitive' };
  }

  return where;
}

function serializeTags(tags) {
  if (!tags || !Array.isArray(tags)) return undefined;
  return JSON.stringify(tags);
}

function deserializeRecord(record) {
  if (!record) return null;
  return {
    ...record,
    tags: record.tags ? JSON.parse(record.tags) : [],
  };
}

const SELECT = {
  id:          true,
  amount:      true,
  type:        true,
  category:    true,
  date:        true,
  description: true,
  tags:        true,
  isDeleted:   true,
  createdAt:   true,
  updatedAt:   true,
  author: {
    select: { id: true, name: true, email: true },
  },
};

// ── Service Methods ───────────────────────────────────────────────────────────

/**
 * Create a new financial record.
 */
async function createRecord({ amount, type, category, date, description, tags }, userId) {
  const record = await prisma.financialRecord.create({
    data: {
      amount,
      type,
      category,
      date,
      description,
      tags:      serializeTags(tags),
      createdBy: userId,
    },
    select: SELECT,
  });

  return deserializeRecord(record);
}

/**
 * List records with filtering, pagination, and sorting.
 * Viewers and analysts see all non-deleted records.
 */
async function listRecords(filters) {
  const { page = 1, limit = 20, sortBy = 'date', sortOrder = 'desc', ...filterParams } = filters;
  const skip  = (page - 1) * limit;
  const where = buildWhere(filterParams);

  const [records, total] = await prisma.$transaction([
    prisma.financialRecord.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { [sortBy]: sortOrder },
      select:  SELECT,
    }),
    prisma.financialRecord.count({ where }),
  ]);

  return {
    records: records.map(deserializeRecord),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Get a single record by ID.
 */
async function getRecordById(id) {
  const record = await prisma.financialRecord.findFirst({
    where:  { id, isDeleted: false },
    select: SELECT,
  });

  if (!record) {
    const err = new Error('Financial record not found');
    err.statusCode = 404;
    err.isOperational = true;
    throw err;
  }

  return deserializeRecord(record);
}

/**
 * Update a record. Only ADMIN or the author can update.
 */
async function updateRecord(id, data, userId, userRole) {
  const existing = await getRecordById(id);

  if (userRole !== 'ADMIN' && existing.author.id !== userId) {
    const err = new Error('You can only edit your own records');
    err.statusCode = 403;
    err.isOperational = true;
    throw err;
  }

  const updateData = { ...data };
  if (data.tags !== undefined) {
    updateData.tags = serializeTags(data.tags);
  }

  const updated = await prisma.financialRecord.update({
    where:  { id },
    data:   updateData,
    select: SELECT,
  });

  return deserializeRecord(updated);
}

/**
 * Soft-delete a record. Only ADMIN or the author can delete.
 */
async function deleteRecord(id, userId, userRole) {
  const existing = await getRecordById(id);

  if (userRole !== 'ADMIN' && existing.author.id !== userId) {
    const err = new Error('You can only delete your own records');
    err.statusCode = 403;
    err.isOperational = true;
    throw err;
  }

  await prisma.financialRecord.update({
    where: { id },
    data:  { isDeleted: true },
  });
}

module.exports = { createRecord, listRecords, getRecordById, updateRecord, deleteRecord };
